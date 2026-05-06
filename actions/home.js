"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/prisma";
import aj from "@/lib/arcjet";
import { request } from "@arcjet/next";


function serializeCarData(car) {
  return {
    ...car,
    price: car.price ? parseFloat(car.price.toString()) : 0,
    createdAt: car.createdAt?.toISOString(),
    updatedAt: car.updatedAt?.toISOString(),
  };
}


 

export async function getPublicStats() {
  try {
    const [cars, testDrives] = await Promise.all([
      db.car.findMany({
        select: { id: true, status: true, featured: true },
      }),
      db.testDriveBooking.findMany({
        select: { id: true, status: true, carId: true },
      }),
    ]);

    const totalCars = cars.length;
    const availableCars = cars.filter((car) => car.status === "AVAILABLE").length;
    const soldCars = cars.filter((car) => car.status === "SOLD").length;
    const reservations = testDrives.length;
    const conversionRate = totalCars > 0 ? (soldCars / totalCars) * 100 : 0;

    return {
      success: true,
      data: {
        totalCars,
        availableCars,
        reservations,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getNewestCars(limit = 4) {
  try {
    const cars = await db.car.findMany({
      where: {
        status: "AVAILABLE",
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return cars.map(serializeCarData);
  } catch (error) {
    throw new Error("Error fetching newest cars:" + error.message);
  }
}

async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString("base64");
}

// Process car image with Gemini AI

export async function processImageSearch(file) {
  try {
    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      requested: 1,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }


    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      requestOptions: { apiVersion: "v1" },
    });


    const base64Image = await fileToBase64(file);

    // Create image part for the model
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: file.type,
      },
    };


    const prompt = `
      Analyze this car image and extract the following information for a search query:
      1. Make (manufacturer)
      2. Body type (SUV, Sedan, Hatchback, etc.)
      3. Color

      Format your response as a clean JSON object with these fields:
      {
        "make": "",
        "bodyType": "",
        "color": "",
        "confidence": 0.0
      }

      For confidence, provide a value between 0 and 1 representing how confident you are in your overall identification.
      Only respond with the JSON object, nothing else.
    `;

    // Get response from Gemini
    const result = await model.generateContent([imagePart, prompt]);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();


    try {
      const carDetails = JSON.parse(cleanedText);

      return {
        success: true,
        data: carDetails,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw response:", text);
      return {
        success: false,
        error: "Failed to parse AI response",
      };
    }
  } catch (error) {
    console.error("AI Search error:", error);
    throw new Error("AI Search error:" + error.message);
  }
}


export async function getFeaturedCars(limit = 4) {
  try {
    const cars = await db.car.findMany({
      where: {
        featured: true,
        status: "AVAILABLE",
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return cars.map(serializeCarData);
  } catch (error) {
    throw new Error("Error fetching featured cars:" + error.message);
  }
}

