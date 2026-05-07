"use client";

import React, { useState } from 'react'
import { z } from "zod";
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, Loader2, Camera } from 'lucide-react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { addCar, processCarImageWithAI } from '@/actions/cars';
import useFetch from '@/hooks/use-fetch';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"];
const transmissions = ["Automatic", "Manual", "Semi-Automatic"];
const bodyTypes = [
  "SUV",
  "Sedan",
  "Hatchback",
  "Convertible",
  "Coupe",
  "Wagon",
  "Pickup",
];
const carStatuses = ["AVAILABLE", "UNAVAILABLE", "SOLD"];

const AddCarForm = () => {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedAiImage, setUploadedAiImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("ai");
  const [imageError, setImageError] = useState("");

  const CarFormSchema = z.object({
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    year: z.string().refine((val) => {
      const year = parseInt(val);
      return !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1;
    }, "Valid year required"),
    price: z.string().min(1, "Price is required"),
    mileage: z.string().min(1, "Mileage is required"),
    color: z.string().min(1, "Color is required"),
    fuelType: z.string().min(1, "Fuel type is required"),
    transmission: z.string().min(1, "Transmission is required"),
    bodyType: z.string().min(1, "Body type is required"),
    seats: z.string().optional(),
    description: z.string().min(10, "Description must be at least 10 characters"),
    status: z.enum(["AVAILABLE", "UNAVAILABLE", "SOLD"]),
    featured: z.boolean().default(false),
  });

  const {
    register,
    setValue,
    getValues,
    formState: { errors },
    handleSubmit,
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(CarFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      price: "",
      mileage: "",
      color: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      seats: "",
      description: "",
      status: "AVAILABLE",
      featured: false,
    },
  });



  const onAiDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    setUploadedAiImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };



  const {
    getRootProps: getAiRootsProps,
    getInputProps: getAiInputProps,
    isDragReject
  } = useDropzone({
    onDrop: onAiDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/jpg": [],
    },
    maxFiles: 1,
  });

  const {
    loading: processImageLoading,
    fn: processImageFn,
    data : processImageResult,
    error: processImageError

  }=useFetch(processCarImageWithAI);

  const processWithAI= async() =>{
    if(!uploadedAiImage){
      toast.error("Please upload an Image");
      return;
    }

    await processImageFn(uploadedAiImage);
  }

  // Handle AI processing errors
  useEffect(() => {
    if (processImageError) {
      toast.error(processImageError.message || "Failed to process image with AI");
    }
  }, [processImageError]);

  // Handle successful AI extraction
  useEffect(() => {
    if (processImageResult) {
      if (!processImageResult.success) {
        // Validation error from AI extraction
        toast.error(processImageResult.error || "Failed to extract car details");
        console.error("AI validation error:", processImageResult);
        return;
      }

      const carDetails = processImageResult.data;

      // Set form values from AI extracted data
      setValue("make", carDetails.make);
      setValue("model", carDetails.model);
      setValue("year", carDetails.year.toString());
      setValue("color", carDetails.color);
      setValue("bodyType", carDetails.bodyType);
      setValue("fuelType", carDetails.fuelType);
      setValue("price", carDetails.price.toString());
      setValue("mileage", carDetails.mileage.toString());
      setValue("transmission", carDetails.transmission);
      setValue("description", carDetails.description);

      // Add uploaded image to images list
      if (uploadedAiImage instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImages((prev) => [...prev, e.target.result]);
        };
        reader.readAsDataURL(uploadedAiImage);
      } else {
        console.warn("uploadedAiImage is not available for preview", uploadedAiImage);
      }

      // Show positive toast after AI extraction
      const confidencePercent = Math.round((processImageResult.confidence || 0) * 100);

      if (processImageResult.partialExtraction) {
        toast.success("AI extracted some details", {
          description: `Great news — the AI extracted available information automatically. ${confidencePercent}% confidence. Complete the remaining fields manually below.`,
        });
      } else {
        toast.success("AI extracted all key details", {
          description: `The image was analyzed successfully. ${confidencePercent}% confidence. Please verify the data and complete any optional fields.`,
        });
      }

      // Switch to manual tab to let user review
      setActiveTab("manual");
    }
  }, [processImageResult, uploadedAiImage, setValue, setActiveTab])

  const { data: addCarResult, loading: addCarLoading, fn: addCarFn } = useFetch(addCar);


  useEffect(() => {
    if (addCarResult?.success) {
      toast.success("Car added successfully!");
      // Reset form and state
      reset();
      setUploadedImages([]);
      setUploadedAiImage(null);
      setImagePreview(null);
      setActiveTab("ai");
      setImageError("");
      router.push("/admin/cars");
    }
  }, [addCarResult, reset, router])

  const onSubmit = async (data) => {
    if (uploadedImages.length === 0) {
      setImageError("Please upload at least one image");
      return;
    }

    const carData = {
      ...data,
      year: parseInt(data.year),
      price: parseFloat(data.price),
      mileage: parseInt(data.mileage),
      seats: data.seats ? parseInt(data.seats) : null,

    };

    await addCarFn({
      carData,
      images: uploadedImages,
    });

  };

  const onMultiImageDrop = (acceptedFiles) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 2MB limit and will be skipped`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newImages = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push(e.target.result);

        if (newImages.length === validFiles.length) {
          setUploadedImages((prev) => [...prev, ...newImages]);
          setUploadProgress(0);
          setImageError("");
          toast.success(
            `Successfully uploaded ${validFiles.length} images`
          );
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const {
    getRootProps: getMultiImageRootProps,
    getInputProps: getMultiImageInputProps
  } = useDropzone({
    onDrop: onMultiImageDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/jpg": [],
    },
    multiple: true,
  });

  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Tabs defaultValue="manual"
        className="mt-6"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="ai">AI Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Car Details</CardTitle>
              <CardDescription>Provide the details of the car you wish to add to the inventory.</CardDescription>
              {processImageResult?.partialExtraction && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                  <p className="text-sm text-emerald-900">
                    ✅ <strong>AI extracted partial details.</strong> Review the fields below and complete any missing information before submitting.
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="make">Make</Label>
                      {processImageResult?.partialExtraction && !getValues("make") && (
                        <span className="text-red-500 text-sm font-semibold">*</span>
                      )}
                    </div>
                    <Input
                      id="make"
                      {...register("make")}
                      placeholder="e.g. Tesla"
                      className={`${errors.make ? "border-red-500" : ""} ${processImageResult?.partialExtraction && !getValues("make") ? "border-orange-300 bg-orange-50" : ""}`}
                    />
                    {errors.make && (
                      <p className="text-xs text-red-500">
                        {errors.make.message}
                      </p>
                    )}
                    {processImageResult?.partialExtraction && !getValues("make") && !errors.make && (
                      <p className="text-xs text-orange-600">
                        Required - AI could not extract this field
                      </p>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      {...register("model")}
                      placeholder="e.g. Camry"
                      className={errors.model ? "border-red-500" : ""}
                    />
                    {errors.model && (
                      <p className="text-xs text-red-500">
                        {errors.model.message}
                      </p>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      {...register("year")}
                      placeholder="e.g. 2022"
                      className={errors.year ? "border-red-500" : ""}
                    />
                    {errors.year && (
                      <p className="text-xs text-red-500">
                        {errors.year.message}
                      </p>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input
                      id="price"
                      {...register("price")}
                      placeholder="e.g. 25,000"
                      className={errors.price ? "border-red-500" : ""}
                    />
                    {errors.price && (
                      <p className="text-xs text-red-500">
                        {errors.price.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input
                      id="mileage"
                      {...register("mileage")}
                      placeholder="e.g. 15,000"
                      className={errors.mileage ? "border-red-500" : ""}
                    />
                    {errors.mileage && (
                      <p className="text-xs text-red-500">
                        {errors.mileage.message}
                      </p>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      {...register("color")}
                      placeholder="e.g. Blue"
                      className={errors.color ? "border-red-500" : ""}
                    />
                    {errors.color && (
                      <p className="text-xs text-red-500">
                        {errors.color.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel Type</Label>
                    <Select
                      onValueChange={(value) => setValue("fuelType", value)}
                      defaultValue={getValues("fuelType")}
                    >
                      <SelectTrigger
                        className={errors.fuelType ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.fuelType && (
                      <p className="text-xs text-red-500">
                        {errors.fuelType.message}
                      </p>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="transmission">Transmission</Label>
                    <Select
                      onValueChange={(value) => setValue("transmission", value)}
                      defaultValue={getValues("transmission")}
                    >
                      <SelectTrigger
                        className={errors.transmission ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Select transmission" />
                      </SelectTrigger>
                      <SelectContent>
                        {transmissions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.transmission && (
                      <p className="text-xs text-red-500">
                        {errors.transmission.message}
                      </p>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="bodyType">Body Type</Label>
                    <Select
                      onValueChange={(value) => setValue("bodyType", value)}
                      defaultValue={getValues("bodyType")}
                    >
                      <SelectTrigger
                        className={errors.bodyType ? "border-red-500" : ""}
                      >
                        <SelectValue placeholder="Select body type" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bodyType && (
                      <p className="text-xs text-red-500">
                        {errors.bodyType.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seats">
                      Number of Seats <span className="text-sm text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      id="seats"
                      {...register("seats")}
                      placeholder="e.g. 5"
                    />
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      onValueChange={(value) => setValue("status", value)}
                      defaultValue={getValues("status")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {carStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Please provide a comprehensive description of the vehicle."
                    className={`min-h-32 ${errors.description ? "border-red-500" : ""
                      }`}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-500">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox
                    id="featured"
                    checked={watch("featured")}
                    onCheckedChange={(checked) => {
                      setValue("featured", checked);
                    }}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="featured">Feature this car</Label>
                    <p className="text-sm text-gray-500">
                      Featured vehicles are highlighted on the homepage.
                    </p>
                  </div>
                </div>


                <div>
                  <Label
                    htmlFor="images"
                    className={imageError ? "text-red-500" : ""}
                  >
                    Images{" "}
                    {imageError && <span className="text-red-500">*</span>}
                  </Label>
                  <div className="mt-2">
                    <div
                      {...getMultiImageRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition ${imageError ? "border-red-500" : "border-gray-300"
                        }`}
                    >
                      <input {...getMultiImageInputProps()} />
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="h-12 w-12 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-600">
                          Drag & drop or click to upload multiple images
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          (JPG, PNG, WebP, maximum 2MB per image)
                        </span>
                      </div>
                    </div>
                    {imageError && (
                      <p className="text-xs text-red-500 mt-1">{imageError}</p>
                    )}
                    {uploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>


                  {uploadedImages.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">
                        Uploaded Images ({uploadedImages.length})
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {uploadedImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <Image
                              src={image}
                              alt={`Car image ${index + 1}`}
                              height={50}
                              width={50}
                              className="h-28 w-full object-cover rounded-md"
                              priority
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={addCarLoading}
                >
                  {addCarLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Car...
                    </>
                  ) : (
                    "Add Car"
                  )}
                </Button>

              </form>
            </CardContent>
          </Card>

        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Based Car Information Extraction</CardTitle>
              <CardDescription>Upload a car image and let Gemini AI extract its details automatically.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-6'>
                <div className='border-2 border-dashed rounded-lg p-6 text-center'>
                  {imagePreview ? (
                    <div className='flex flex-col items-center'>
                      <img src={imagePreview}
                       alt="Car Preview" 
                       className='max-h-56 max-w-full object-contain mb-4'/>
                       <div className='flex gap-2'>
                        <Button 
                        variant="outline"
                        size="sm"
                        onClick={()=>{
                          setImagePreview(null);
                          setUploadedAiImage(null);
                        }}
                        >
                          Remove
                        </Button>

                        <Button 
                          size="sm"
                          onClick={processWithAI}
                          disabled={processImageLoading}
                        >
                          {processImageLoading? (<>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Processing...
                          </>):(
                            <>
                              <Camera className='mr-2 h-4 w-4' />
                              Extract Details
                            </>)}
                        </Button>
                       </div>
                    </div>
                  ) : (
                  <div {...getAiRootsProps()} className='cursor-pointer hover:bg-gray-50 transition'>
                    <input {...getAiInputProps()} />
                    <div className='flex flex-col items-center justify-center'>
                      <Camera className='h-12 w-12 text-gray-600 text-sm' />
                      <p>
                        Drag & drop an image here, or click to select a file
                      </p>
                      {isDragReject && (
                        <p className="text-red-500">Unsupported file type</p>
                      )}
                      <p className='text-gray-500 text-xs mt-2'>
                        Supported formats: JPEG, PNG, JPG, WebP (max 2MB)
                      </p>
                    </div>
                  </div>
                )}
                </div>

                 <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">How it works</h3>
                  <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-4">
                    <li>Upload a clear image of the vehicle.</li>
                    <li>Click "Extract Details" to analyze the image with Gemini AI.</li>
                    <li>Review the extracted information for accuracy.</li>
                    <li>Manually complete any missing details.</li>
                    <li>Add the car to your inventory.</li>
                  </ol>
                </div>

                <div className="bg-amber-50 p-4 rounded-md">
                  <h3 className="font-medium text-amber-800 mb-1">
                    Tips for optimal results
                  </h3>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>• Use high-quality, well-lit images</li>
                    <li>• Ensure the entire vehicle is visible</li>
                    <li>• For complex models, provide multiple views</li>
                    <li>• Always verify the AI-extracted information</li>
                  </ul>
                </div>

              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AddCarForm