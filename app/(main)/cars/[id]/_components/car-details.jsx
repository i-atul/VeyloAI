"use client"

import { toggleSavedCar } from '@/actions/car-listing';
import { useAuth } from '@clerk/clerk-react';
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';
import { Car, Heart, Gauge, Fuel, Share2, Currency, Calendar,  MapIcon, Verified  } from 'lucide-react';
import Image from 'next/image';
import useFetch from '@/hooks/use-fetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/helper';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import EmiCalculatorFn from './emi-calculator';
import { MessageSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from "date-fns";

const CarDetails = ({ car, testDriveInfo }) => {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isWishlisted, setIsWishlisted] = useState(car.wishlisted);

    const {
        loading: savingCar,
        fn: toggleSavedCarFn,
        data: toggleResult,
        error: toggleError,
    } = useFetch(toggleSavedCar);

    useEffect(() => {
        if (toggleResult?.success) {
            setIsWishlisted(toggleResult.saved);
            toast.success(toggleResult.message);
        }
    }, [toggleResult, isWishlisted]);

    useEffect(() => {
        if (toggleError) {
            toast.error("Failed to update favorites");
        }
    }, [toggleError]);

    const handleSaveCar = async () => {
        if (!isSignedIn) {
            toast.error("Please sign in to save cars");
            router.push("/sign-in");
            return;
        }

        if (savingCar) return;

        await toggleSavedCarFn(car.id);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator
                .share({
                    title: `${car.year} ${car.make} ${car.model}`,
                    text: `Check out this ${car.year} ${car.make} ${car.model} on Veylo!`,
                    url: window.location.href,
                })
                .catch((error) => {
                    console.log("Error sharing", error);
                    copyToClipboard();
                });
        } else {
            copyToClipboard();
        }
    };

    const handleBookTestDrive = () => {
        if (!isSignedIn) {
            toast.error("Please sign in to book a test drive");
            router.push("/sign-in");
            return;
        }
        router.push(`/test-drive/${car.id}`);
    };


    return (
        <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen pb-16">
            <div className="flex flex-col lg:flex-row gap-10 max-w-6xl mx-auto pt-10 px-4 md:px-8 xl:px-0">
                <div className="w-full lg:w-7/12">
                    <div className="aspect-video rounded-xl overflow-hidden relative mb-6 shadow-lg border border-gray-200">
                        {car.images && car.images.length > 0 ? (
                            <Image
                                src={car.images[currentImageIndex] || "/logo.png"}
                                alt={`${car.year} ${car.make} ${car.model}`}
                                fill
                                className="object-cover transition-transform duration-300 hover:scale-105"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <Car className="h-24 w-24 text-gray-300" />
                            </div>
                        )}
                    </div>
                    {/* Thumbnails */}
                    {car.images && car.images.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {car.images.map((image, index) => (
                                <div
                                    key={index}
                                    className={`relative cursor-pointer rounded-lg h-20 w-28 flex-shrink-0 border-2 transition-all duration-200 ${index === currentImageIndex
                                        ? "border-cyan-500 shadow-lg"
                                        : "border-transparent opacity-70 hover:opacity-100 hover:border-cyan-300"
                                        }`}
                                    onClick={() => setCurrentImageIndex(index)}
                                >
                                    <Image
                                        src={image || "/logo.png"}
                                        alt={`${car.year} ${car.make} ${car.model} - view ${index + 1}`}
                                        fill
                                        className="object-cover rounded-lg"
                                    />
                                </div>
                            ))}
                        </div>
                    )};

                    {/* Secondary Actions */}
                    <div className="flex mt-6 gap-4">
                        <Button
                            variant="outline"
                            className={`flex items-center gap-2 flex-1 bg-gradient-to-r from-[#2af598] to-[#009efd] hover:from-gray-950 hover:to-gray-800 hover:text-white text-white font-semibold shadow-md border-none transition-all duration-200 ${isWishlisted ? "ring-2 ring-red-400" : ""}`}
                            onClick={handleSaveCar}
                            disabled={savingCar}
                        >
                            <Heart
                                className={`h-5 w-5 ${isWishlisted ? "fill-red-500" : ""}`}
                            />
                            {isWishlisted ? "Saved to Favorites" : "Add to Favorites"}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex items-center gap-2 flex-1 bg-gradient-to-r from-[#2af598] to-[#009efd] hover:from-gray-950 hover:to-gray-800 text-white hover:text-white font-semibold shadow-md border-none transition-all duration-200"
                            onClick={handleShare}
                        >
                            <Share2 className="h-5 w-5" />
                            Share Listing
                        </Button>
                    </div>
                </div>
                <div className="w-full lg:w-5/12">
                    <div className="flex items-center justify-between mb-2">
                        < Verified className="h-6 w-6 text-cyan-500" />
                        {/* <Badge className="mb-2 px-4 py-1 text-base bg-black text-shadow-white font-semibold rounded-full shadow-sm">Verified</Badge> */}
                    </div>

                    <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-gray-900">
                        {car.year} {car.make} {car.model}
                    </h1>

                    <div className="text-3xl font-bold text-cyan-500 mb-4">
                        {formatCurrency(car.price)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-6">
                        <div className="flex items-center gap-2 text-gray-700">
                            <Gauge className="text-cyan-400 h-5 w-5" />
                            <span className="font-medium">{car.mileage.toLocaleString()} mi</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Fuel className="text-cyan-400 h-5 w-5" />
                            <span className="font-medium">{car.fuelType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                            <Car className="text-cyan-400 h-5 w-5" />
                            <span className="font-medium">{car.transmission}</span>
                        </div>
                    </div>

                    <Dialog>
                        <DialogTrigger className="w-full text-start">
                            <Card className="pt-5 hover:shadow-lg transition-shadow">
                                <CardContent>
                                    <div className="flex items-center gap-2 text-lg font-semibold mb-2">
                                        <Currency className="h-5 w-5 text-cyan-400" />
                                        <h3>EMI Calculator</h3>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Est. Monthly Payment: <span className="font-bold text-gray-900">{formatCurrency(car.price / 60)}</span> <span className="text-xs">(60 mo)</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        *$0 down, 6.5% APR, for illustration only
                                    </div>
                                </CardContent>
                            </Card>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Car Loan Calculator</DialogTitle>
                                <EmiCalculatorFn price={car.price} />
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>

                    {(car.status === "SOLD" || car.status === "UNAVAILABLE") && (
                        <Alert variant="destructive">
                            <AlertTitle className="capitalize">
                                This car is {car.status.toLowerCase()}
                            </AlertTitle>
                            <AlertDescription>Please check back soon for similar vehicles.</AlertDescription>
                        </Alert>
                    )}

                    {/* Book Test Drive Button */}
                    {car.status !== "SOLD" && car.status !== "UNAVAILABLE" && (
                        <Button
                            className="w-full py-6 text-lg font-bold cursor-pointer bg-gradient-to-r from-[#2af598] to-[#009efd] hover:from-gray-950 hover:to-gray-800 text-white shadow-lg mt-20 border-none transition-all duration-200"
                            onClick={handleBookTestDrive}
                            disabled={testDriveInfo.userTestDrive}
                        >
                            <Calendar className="mr-2 h-5 w-5" />
                            {testDriveInfo.userTestDrive
                                ? `Test Drive Booked: ${format(new Date(testDriveInfo.userTestDrive.bookingDate), "EEEE, MMM d, yyyy")}`
                                : "Book a Test Drive"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Details & Features Section */}
            <div className="mt-16 max-w-6xl mx-auto p-8 bg-white rounded-xl shadow-md border border-gray-100 px-4 md:px-8 xl:px-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                        <h3 className="text-2xl font-bold mb-4 text-gray-900">Vehicle Description</h3>
                        <p className="whitespace-pre-line text-gray-700 leading-relaxed text-lg">
                            {car.description}
                        </p>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold mb-4 text-gray-900">Key Features</h3>
                        <ul className="grid grid-cols-1 gap-3 text-gray-700 text-base">
                            <li className="flex items-center gap-2">
                                <span className="h-2 w-2 bg-cyan-400 rounded-full"></span>
                                {car.transmission} Transmission
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-2 w-2 bg-cyan-400 rounded-full"></span>
                                {car.bodyType} Body Style
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-2 w-2 bg-cyan-400 rounded-full"></span>
                                {car.fuelType} Engine
                            </li>
                            {car.seats && (
                                <li className="flex items-center gap-2">
                                    <span className="h-2 w-2 bg-cyan-400 rounded-full"></span>
                                    {car.seats} Seats
                                </li>
                            )}
                            <li className="flex items-center gap-2">
                                <span className="h-2 w-2 bg-cyan-400 rounded-full"></span>
                                {car.color} Exterior
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Specifications Section */}
            <div className="mt-10 max-w-6xl mx-auto p-8 bg-white rounded-xl shadow-md border border-gray-100 px-4 md:px-8 xl:px-12">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Specifications</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                        <div className="flex justify-between py-2 border-b text-gray-700">
                            <span>Brand</span>
                            <span className="font-medium">{car.make}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-gray-700">
                            <span>Year</span>
                            <span className="font-medium">{car.year}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-gray-700">
                            <span>Fuel Type</span>
                            <span className="font-medium">{car.fuelType}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-gray-700">
                            <span>Body Type</span>
                            <span className="font-medium">{car.bodyType}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-gray-700">
                            <span>Model</span>
                            <span className="font-medium">{car.model}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-gray-700">
                            <span>Color</span>
                            <span className="font-medium">{car.color}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-gray-700">
                            <span>Transmission</span>
                            <span className="font-medium">{car.transmission}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-gray-700">
                            <span>Mileage</span>
                            <span className="font-medium">{car.mileage.toLocaleString()} mi</span>
                        </div>
                        {car.seats && (
                            <div className="flex justify-between py-2 border-b text-gray-700">
                                <span>Seats</span>
                                <span className="font-medium">{car.seats}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Questions/Contact Section moved below Specifications */}
            <div className="mt-8 max-w-6xl mx-auto px-4 md:px-8 xl:px-0">
                <Card className="rounded-xl shadow-md border border-gray-100 bg-gradient-to-r from-[#2af598] to-[#009efd] text-white">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex items-center gap-4">
                            <MessageSquare className="h-10 w-10 text-white" />
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Questions? We're here to help.</h3>
                                <p className="text-base mb-2">Contact our team for more details or to schedule a viewing. We’re committed to your satisfaction.</p>
                                <a href="/contact-us">
                                    <Button variant="outline" className="bg-white text-cyan-600 font-semibold hover:bg-gray-100 border-none shadow-sm transition-all duration-200 px-6 py-3 mt-2">
                                        Contact Us
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dealership Location Section */}
            <div className="mt-10 max-w-6xl mx-auto p-8 bg-white rounded-xl shadow-md border border-gray-100 px-4 md:px-8 xl:px-12">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Dealership Location</h2>
                <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex flex-col md:flex-row gap-8 justify-between">
                        {/* Dealership Name and Address */}
                        <div className="flex items-start gap-4">
                            <MapIcon className="h-6 w-6 text-cyan-400 mt-1 flex-shrink-0" />
                            <div>
                                <h4 className="font-semibold text-lg">Veylo Inc.</h4>
                                <p className="text-gray-600">
                                    {testDriveInfo.dealership?.address || "Not Available"}
                                </p>
                                <p className="text-gray-600 mt-1">
                                    <span className="font-medium">Phone:</span> {testDriveInfo.dealership?.phone || "Not Available"}
                                </p>
                                <p className="text-gray-600">
                                    <span className="font-medium">Email:</span> {testDriveInfo.dealership?.email || "Not Available"}
                                </p>
                            </div>
                        </div>

                        {/* Working Hours */}
                        <div className="md:w-1/2 lg:w-1/3">
                            <h4 className="font-semibold mb-2 text-lg">Working Hours</h4>
                            <div className="space-y-2">
                                {testDriveInfo.dealership?.workingHours
                                    ? testDriveInfo.dealership.workingHours
                                        .sort((a, b) => {
                                            const days = [
                                                "MONDAY",
                                                "TUESDAY",
                                                "WEDNESDAY",
                                                "THURSDAY",
                                                "FRIDAY",
                                                "SATURDAY",
                                                "SUNDAY",
                                            ];
                                            return (
                                                days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek)
                                            );
                                        })
                                        .map((day) => (
                                            <div
                                                key={day.dayOfWeek}
                                                className="flex justify-between text-base text-gray-700"
                                            >
                                                <span>
                                                    {day.dayOfWeek.charAt(0) +
                                                        day.dayOfWeek.slice(1).toLowerCase()}
                                                </span>
                                                <span>
                                                    {day.isOpen
                                                        ? `${day.openTime} - ${day.closeTime}`
                                                        : "Closed"}
                                                </span>
                                            </div>
                                        ))
                                    : // Default hours if none provided
                                    [
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday",
                                        "Sunday",
                                    ].map((day, index) => (
                                        <div key={day} className="flex justify-between text-base text-gray-700">
                                            <span>{day}</span>
                                            <span>
                                                {index < 5
                                                    ? "9:00 - 18:00"
                                                    : index === 5
                                                        ? "10:00 - 16:00"
                                                        : "Closed"}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default CarDetails