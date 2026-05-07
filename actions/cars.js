"use server"

import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase";
import { serializeCarData } from "@/lib/helper";

// Validation constants
const VALID_FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"];
const VALID_TRANSMISSIONS = ["Automatic", "Manual", "Semi-Automatic"];
const VALID_BODY_TYPES = ["SUV", "Sedan", "Hatchback", "Convertible", "Coupe", "Wagon", "Pickup"];
const VALID_STATUSES = ["AVAILABLE", "UNAVAILABLE", "SOLD"];
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1980;
const MAX_YEAR = CURRENT_YEAR + 1;
const MIN_PRICE = 100000; // Minimum price in INR
const MAX_PRICE = 100000000; // Maximum price in INR (10 crore)
const MAX_MILEAGE = 99;

// Validation result structure
function validationError(message, field) {
  return {
    success: false,
    error: message,
    field: field || null
  };
}

// Soft validation for AI extracted data - lenient, allows empty fields
function softValidateAICarData(carDetails) {
  const warnings = [];
  const extractedFields = {};

  // Helper function to find closest enum match
  const findClosestMatch = (value, validOptions) => {
    const cleanValue = String(value).trim();
    
    // Exact match
    if (validOptions.includes(cleanValue)) {
      return cleanValue;
    }

    // Case-insensitive match
    const lowerValue = cleanValue.toLowerCase();
    const match = validOptions.find(opt => opt.toLowerCase() === lowerValue);
    if (match) return match;

    // Partial match - check if value contains any valid option
    for (const option of validOptions) {
      if (cleanValue.toLowerCase().includes(option.toLowerCase())) {
        warnings.push(`Auto-corrected ${cleanValue} → ${option}`);
        return option;
      }
    }

    // No match found - return empty string and warn
    warnings.push(`Could not match "${cleanValue}". Valid options: ${validOptions.join(", ")}`);
    return "";
  };

  // Extract make and model (required)
  const make = carDetails.make ? String(carDetails.make).trim() : "";
  const model = carDetails.model ? String(carDetails.model).trim() : "";
  
  if (!make) {
    warnings.push("Make not extracted - please provide manually");
  } else if (make.length > 50) {
    warnings.push(`Make truncated to 50 characters`);
    extractedFields.make = make.substring(0, 50);
  } else {
    extractedFields.make = make;
  }

  if (!model) {
    warnings.push("Model not extracted - please provide manually");
  } else if (model.length > 50) {
    warnings.push(`Model truncated to 50 characters`);
    extractedFields.model = model.substring(0, 50);
  } else {
    extractedFields.model = model;
  }

  // Extract year (required)
  const year = Number(carDetails.year);
  if (isNaN(year) || !Number.isInteger(year)) {
    warnings.push("Year not properly extracted - please provide manually");
    extractedFields.year = "";
  } else if (year < MIN_YEAR || year > MAX_YEAR) {
    warnings.push(`Year ${year} out of range (${MIN_YEAR}-${MAX_YEAR}) - please verify`);
    extractedFields.year = "";
  } else {
    extractedFields.year = year;
  }

  // Extract color (optional but try to extract)
  const color = carDetails.color ? String(carDetails.color).trim() : "";
  if (color && color.length > 30) {
    warnings.push(`Color truncated to 30 characters`);
    extractedFields.color = color.substring(0, 30);
  } else {
    extractedFields.color = color;
  }

  // Extract body type with fuzzy matching
  const bodyType = carDetails.bodyType ? String(carDetails.bodyType).trim() : "";
  if (bodyType) {
    extractedFields.bodyType = findClosestMatch(bodyType, VALID_BODY_TYPES);
  } else {
    extractedFields.bodyType = "";
  }

  // Extract fuel type with fuzzy matching
  const fuelType = carDetails.fuelType ? String(carDetails.fuelType).trim() : "";
  if (fuelType) {
    extractedFields.fuelType = findClosestMatch(fuelType, VALID_FUEL_TYPES);
  } else {
    extractedFields.fuelType = "";
  }

  // Extract transmission with fuzzy matching
  const transmission = carDetails.transmission ? String(carDetails.transmission).trim() : "";
  if (transmission) {
    extractedFields.transmission = findClosestMatch(transmission, VALID_TRANSMISSIONS);
  } else {
    extractedFields.transmission = "";
  }

  // Extract price (required but allow empty)
  const price = Number(carDetails.price);
  if (isNaN(price) || price <= 0) {
    warnings.push("Price not properly extracted - please provide manually");
    extractedFields.price = "";
  } else if (price < MIN_PRICE || price > MAX_PRICE) {
    warnings.push(`Price out of expected range - please verify`);
    extractedFields.price = price;
  } else {
    extractedFields.price = price;
  }

  // Extract mileage (required but allow empty)
  const mileage = Number(carDetails.mileage);
  if (isNaN(mileage) || !Number.isInteger(mileage)) {
    warnings.push("Mileage not properly extracted - please provide manually");
    extractedFields.mileage = "";
  } else if (mileage < 0 || mileage > MAX_MILEAGE) {
    warnings.push("Mileage out of expected range - please verify");
    extractedFields.mileage = "";
  } else {
    extractedFields.mileage = mileage;
  }

  // Extract description (required but allow empty)
  const description = carDetails.description ? String(carDetails.description).trim() : "";
  if (description && description.length < 10) {
    warnings.push("Description is too short - please expand");
    extractedFields.description = description.length > 0 ? description : "";
  } else if (description && description.length > 1000) {
    warnings.push("Description truncated to 1000 characters");
    extractedFields.description = description.substring(0, 1000);
  } else {
    extractedFields.description = description;
  }

  // Extract confidence
  const confidence = Number(carDetails.confidence) || 0;
  extractedFields.confidence = Math.min(1, Math.max(0, confidence));

  if (extractedFields.confidence < 0.4) {
    warnings.push("⚠️ Low AI confidence - please carefully review all extracted details");
  }

  return {
    success: true,
    data: extractedFields,
    warnings: warnings,
    confidence: extractedFields.confidence,
    partialExtraction: Object.values(extractedFields).some(v => v === "" || v === null)
  };
}

// Strict validation for AI extracted data - strict, requires all fields
function validateAICarData(carDetails) {
  // Check required fields exist and are non-empty
  const requiredFields = ["make", "model", "year", "color", "bodyType", "price", "mileage", "fuelType", "transmission", "description", "confidence"];
  
  for (const field of requiredFields) {
    if (!(field in carDetails) || carDetails[field] === null || carDetails[field] === "") {
      return validationError(`AI extraction missing required field: ${field}`, field);
    }
  }

  // Validate make and model
  const make = String(carDetails.make).trim();
  const model = String(carDetails.model).trim();
  
  if (make.length < 2 || make.length > 50) {
    return validationError("Make must be between 2-50 characters", "make");
  }
  if (model.length < 1 || model.length > 50) {
    return validationError("Model must be between 1-50 characters", "model");
  }
  if (!/^[a-zA-Z0-9\s\-]+$/.test(make)) {
    return validationError("Make contains invalid characters", "make");
  }
  if (!/^[a-zA-Z0-9\s\-]+$/.test(model)) {
    return validationError("Model contains invalid characters", "model");
  }

  // Validate year
  const year = Number(carDetails.year);
  if (isNaN(year) || !Number.isInteger(year)) {
    return validationError("Year must be a valid integer", "year");
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return validationError(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}`, "year");
  }

  // Validate color
  const color = String(carDetails.color).trim();
  if (color.length < 2 || color.length > 30) {
    return validationError("Color must be between 2-30 characters", "color");
  }
  if (!/^[a-zA-Z\s]+$/.test(color)) {
    return validationError("Color should only contain letters and spaces", "color");
  }

  // Validate body type
  const bodyType = String(carDetails.bodyType).trim();
  if (!VALID_BODY_TYPES.includes(bodyType)) {
    return validationError(`Body type must be one of: ${VALID_BODY_TYPES.join(", ")}`, "bodyType");
  }

  // Validate fuel type
  const fuelType = String(carDetails.fuelType).trim();
  if (!VALID_FUEL_TYPES.includes(fuelType)) {
    return validationError(`Fuel type must be one of: ${VALID_FUEL_TYPES.join(", ")}`, "fuelType");
  }

  // Validate transmission
  const transmission = String(carDetails.transmission).trim();
  if (!VALID_TRANSMISSIONS.includes(transmission)) {
    return validationError(`Transmission must be one of: ${VALID_TRANSMISSIONS.join(", ")}`, "transmission");
  }

  // Validate price
  const price = Number(carDetails.price);
  if (isNaN(price) || price <= 0) {
    return validationError("Price must be a positive number", "price");
  }
  if (price < MIN_PRICE || price > MAX_PRICE) {
    return validationError(`Price must be between ₹${MIN_PRICE.toLocaleString()} and ₹${MAX_PRICE.toLocaleString()}`, "price");
  }

  // Validate mileage
  const mileage = Number(carDetails.mileage);
  if (isNaN(mileage) || !Number.isInteger(mileage)) {
    return validationError("Mileage must be a valid integer", "mileage");
  }
  if (mileage < 0 || mileage > MAX_MILEAGE) {
    return validationError(`Mileage must be between 0 and ${MAX_MILEAGE}`, "mileage");
  }

  // Semantic check: AI extracted used cars shouldn't have very low mileage
  if (year < CURRENT_YEAR && mileage < 1000) {
    return validationError(`Warning: ${year} car with mileage of ${mileage} seems unrealistic. Expected minimum 5000 miles for used car.`, "mileage");
  }

  // Validate description
  const description = String(carDetails.description).trim();
  if (description.length < 10 || description.length > 1000) {
    return validationError("Description must be between 10-1000 characters", "description");
  }

  // Validate confidence
  const confidence = Number(carDetails.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    return validationError("Confidence must be a number between 0 and 1", "confidence");
  }

  // Warn if confidence is low
  if (confidence < 0.5) {
    console.warn(`Warning: AI confidence is low (${(confidence * 100).toFixed(1)}%). Please verify extracted details.`);
  }

  return { success: true, data: carDetails };
}

// Comprehensive validation for car data before saving
function validateCarData(carData) {
  // Check all required fields
  const requiredFields = ["make", "model", "year", "price", "mileage", "color", "fuelType", "transmission", "bodyType", "description", "status"];
  
  for (const field of requiredFields) {
    if (carData[field] === undefined || carData[field] === null || carData[field] === "") {
      return validationError(`Missing required field: ${field}`, field);
    }
  }

  // Validate make
  const make = String(carData.make).trim();
  if (make.length < 2 || make.length > 50) {
    return validationError("Make must be between 2-50 characters", "make");
  }

  // Validate model
  const model = String(carData.model).trim();
  if (model.length < 1 || model.length > 50) {
    return validationError("Model must be between 1-50 characters", "model");
  }

  // Validate year
  const year = Number(carData.year);
  if (isNaN(year) || !Number.isInteger(year)) {
    return validationError("Year must be a valid integer", "year");
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return validationError(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}`, "year");
  }

  // Validate price
  const price = Number(carData.price);
  if (isNaN(price) || price <= 0) {
    return validationError("Price must be a positive number", "price");
  }
  if (price < MIN_PRICE || price > MAX_PRICE) {
    return validationError(`Price must be between ₹${MIN_PRICE.toLocaleString()} and ₹${MAX_PRICE.toLocaleString()}`, "price");
  }

  // Validate mileage
  const mileage = Number(carData.mileage);
  if (isNaN(mileage) || !Number.isInteger(mileage)) {
    return validationError("Mileage must be a valid integer", "mileage");
  }
  if (mileage < 0 || mileage > MAX_MILEAGE) {
    return validationError(`Mileage must be between 0 and ${MAX_MILEAGE}`, "mileage");
  }

  // Validate color
  const color = String(carData.color).trim();
  if (color.length < 2 || color.length > 30) {
    return validationError("Color must be between 2-30 characters", "color");
  }

  // Validate fuel type
  const fuelType = String(carData.fuelType).trim();
  if (!VALID_FUEL_TYPES.includes(fuelType)) {
    return validationError(`Invalid fuel type. Must be one of: ${VALID_FUEL_TYPES.join(", ")}`, "fuelType");
  }

  // Validate transmission
  const transmission = String(carData.transmission).trim();
  if (!VALID_TRANSMISSIONS.includes(transmission)) {
    return validationError(`Invalid transmission. Must be one of: ${VALID_TRANSMISSIONS.join(", ")}`, "transmission");
  }

  // Validate body type
  const bodyType = String(carData.bodyType).trim();
  if (!VALID_BODY_TYPES.includes(bodyType)) {
    return validationError(`Invalid body type. Must be one of: ${VALID_BODY_TYPES.join(", ")}`, "bodyType");
  }

  // Validate description
  const description = String(carData.description).trim();
  if (description.length < 10 || description.length > 1000) {
    return validationError("Description must be between 10-1000 characters", "description");
  }

  // Validate status
  const status = String(carData.status).toUpperCase();
  if (!VALID_STATUSES.includes(status)) {
    return validationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, "status");
  }

  // Validate featured (optional, should be boolean)
  if (carData.featured !== undefined && typeof carData.featured !== "boolean") {
    return validationError("Featured must be a boolean value", "featured");
  }

  // Validate seats (optional)
  if (carData.seats !== undefined && carData.seats !== null) {
    const seats = Number(carData.seats);
    if (isNaN(seats) || !Number.isInteger(seats) || seats < 1 || seats > 9) {
      return validationError("Seats must be an integer between 1 and 9", "seats");
    }
  }

  // Semantic validation: Year vs Mileage relationship
  if (year < CURRENT_YEAR) {
    const age = CURRENT_YEAR - year;
    const maxExpectedMileage = age * 20000; // Assume max 20k miles per year
    
    if (mileage > maxExpectedMileage * 1.5) {
      console.warn(`Warning: Car mileage (${mileage}) seems high for a ${age}-year-old vehicle. Expected max ~${maxExpectedMileage} miles.`);
    }
  }

  // Semantic validation: Price range based on year and mileage
  if (year < CURRENT_YEAR - 15) {
    // Older cars should generally be cheaper (unless rare/classic)
    if (price > 3000000) { // 30 lakhs
      console.warn(`Warning: High price for a car older than 15 years. Please verify pricing.`);
    }
  }

  return { success: true, data: carData };
}

async function fileToBase64(file) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return buffer.toString("base64");
}

export async function processCarImageWithAI(file) {
    try {
        // ensure we use the proper environment variable name (Windows envs are case-insensitive but keep it consistent)
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Gemini API key is not set");
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Gemini models live on the v1 endpoint; requestOptions overrides the
        // default v1beta path used by the SDK.  The previous `gemini-1.5` name
        // returned a 404 because the fresh API key only has access to newer
        // generations.  Use `listModels.js` script to see what your key can call.
        // `gemini-2.5-flash` is one of the available multimodal models in the
        // project as of 2026-02-15.
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          requestOptions: { apiVersion: "v1" },
        });

        const base64Image = await fileToBase64(file);

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: file.type,
            },
        };

        const prompt = `
      Analyze this car image and extract the following information:
      1. Make (manufacturer)
      2. Model
      3. Year (approximately)
      4. Color
      5. Body type (SUV, Sedan, Hatchback, etc.)
      6. Mileage
      7. Fuel type (your best guess)
      8. Transmission type (your best guess)
      9. Price (your best guess)
      9. Short Description as to be added to a car listing

      Format your response as a clean JSON object with these fields:
      {
        "make": "",
        "model": "",
        "year": 0000,
        "color": "",
        "price": "",
        "mileage": "",
        "bodyType": "",
        "fuelType": "",
        "transmission": "",
        "description": "",
        "confidence": 0.0
      }

      For confidence, provide a value between 0 and 1 representing how confident you are in your overall identification.
      Only respond with the JSON object, nothing else.
    `;


        const result = await model.generateContent([imagePart, prompt]);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

        try {
            const carDetails = JSON.parse(cleanedText);

            // Use SOFT validation for AI extraction - allows partial extraction
            const validation = softValidateAICarData(carDetails);
            
            // Always return success with whatever we could extract
            // User will fill in missing fields manually
            const resultData = {
                make: validation.data.make || "",
                model: validation.data.model || "",
                year: validation.data.year || "",
                color: validation.data.color || "",
                bodyType: validation.data.bodyType || "",
                price: validation.data.price || "",
                mileage: validation.data.mileage || "",
                fuelType: validation.data.fuelType || "",
                transmission: validation.data.transmission || "",
                description: validation.data.description || "",
                confidence: validation.confidence,
            };

            return {
                success: true,
                data: resultData,
                confidence: validation.confidence,
                warnings: validation.warnings,
                partialExtraction: validation.partialExtraction
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to parse AI response: ${error.message}`,
            };

        }

    } catch (error) {
        console.error("Error processing car image with AI:", error);
        return {
            success: false,
            error: error.message || "An error occurred while processing the image.",
        };

    }
}




export async function addCar({ carData, images }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

   
    const carId = uuidv4();
    const folderPath = `cars/${carId}`;


    const supabase = createClient();
    const bucket = process.env.SUPABASE_BUCKET || "vehicle_image";
    const imageUrls = [];

    for (let i = 0; i < images.length; i++) {
      const base64Data = images[i];

      if (!base64Data || !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(base64Data)) {
        console.warn("Skipping invalid image data");
        continue;
      }

      const base64 = base64Data.split(",")[1];
      const imageBuffer = Buffer.from(base64, "base64");

      const mimeMatch = base64Data.match(/data:image\/(jpeg|jpg|png|webp);/);
      const fileExtension = mimeMatch ? mimeMatch[1].replace("jpg", "jpeg") : "jpeg";
      const fileName = `image-${Date.now()}-${i}.${fileExtension}`;
      const filePath = `${folderPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, imageBuffer, {
          contentType: `image/${fileExtension}`,
        });

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Try to get public URL first
      const { data: publicUrlData } = await supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        imageUrls.push(publicUrlData.publicUrl);
      } else {
        // If public URL fails, use signed URL with 1-year expiration for reliability
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiration

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error("Error generating signed URL:", signedUrlError);
          throw new Error("Failed to generate image URL after upload");
        }

        imageUrls.push(signedUrlData.signedUrl);
      }
    }

    // Validate all car data before saving to database
    const validation = validateCarData(carData);
    
    if (!validation.success) {
      return validation; // Return validation error with field info
    }

    if (imageUrls.length === 0) {
      return {
        success: false,
        error: "No valid images were uploaded",
        field: "images"
      };
    }

    try {
      const car = await db.car.create({
        data: {
          id: carId, 
          make: validation.data.make,
          model: validation.data.model,
          year: validation.data.year,
          price: validation.data.price, 
          mileage: validation.data.mileage,
          color: validation.data.color,
          fuelType: validation.data.fuelType,
          transmission: validation.data.transmission,
          bodyType: validation.data.bodyType,
          seats: carData.seats ? Number(carData.seats) : null,
          description: validation.data.description,
          status: validation.data.status.toUpperCase(),
          featured: carData.featured || false,
          images: imageUrls, 
        },
      });
      revalidatePath("/admin/cars");
      return {
        success: true,
        message: `Car added successfully: ${validation.data.make} ${validation.data.model}`,
      };
    } catch (error) {
      console.error("Database error while adding car:", error);
      return {
        success: false,
        error: `Failed to add car to database: ${error.message}`,
      };
    }
  } catch (error) {
    throw new Error("Error adding car:" + error.message);
  }
}

export async function getCars(search = "") {
  try {
    
    let where = {};

    if (search) {
      where.OR = [
        { make: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ];
    }

 
    const cars = await db.car.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const serializedCars = cars.map(serializeCarData);

    return {
      success: true,
      data: serializedCars,
    };
  } catch (error) {
    console.error("Error fetching cars:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function deleteCar(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    
    const car = await db.car.findUnique({
      where: { id },
      select: { images: true },
    });

    if (!car) {
      return {
        success: false,
        error: "Car not found",
      };
    }

    await db.car.delete({
      where: { id },
    });

    try {
      const supabase = createClient();
      const bucket = process.env.SUPABASE_BUCKET || "vehicle_image";

      const filePaths = car.images
        .map((imageUrl) => {
          const url = new URL(imageUrl);
          // Handle public URLs: /storage/v1/object/public/bucket/path
          let pathMatch = url.pathname.match(new RegExp(`/storage/v1/object/public/${bucket}/(.*)`));
          if (pathMatch) return pathMatch[1];
          
          // Handle signed URLs: /storage/v1/object/sign/bucket/path or /storage/v1/object/authenticated/bucket/path
          pathMatch = url.pathname.match(new RegExp(`/storage/v1/object/(sign|authenticated)/${bucket}/(.*)`));
          if (pathMatch) return pathMatch[2];
          
          return null;
        })
        .filter(Boolean);

      if (filePaths.length > 0) {
        const { error } = await supabase.storage.from(bucket).remove(filePaths);

        if (error) {
          console.error("Error deleting images:", error);
        }
      }
    } catch (storageError) {
      console.error("Error with storage operations:", storageError);
    }

    revalidatePath("/admin/cars");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting car:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function updateCarStatus(id, { status, featured }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const updateData = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (featured !== undefined) {
      updateData.featured = featured;
    }

  
    await db.car.update({
      where: { id },
      data: updateData,
    });

   
    revalidatePath("/admin/cars");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating car status:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}