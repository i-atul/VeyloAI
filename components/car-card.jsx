"use client";

import React, { use } from 'react'
import { Card, CardContent } from './ui/card'
import Image from 'next/image'
import { Button } from './ui/button'
import { CarIcon, Heart, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from './ui/badge';
import { useRouter } from 'next/navigation';
import useFetch from '@/hooks/use-fetch';
import { toggleSavedCar } from '@/actions/car-listing';
import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/helper';



const CarCard = ({car}) => {

    const [isSaved, setIsSaved] = useState(car.wishlisted);
    const router = useRouter();
    const {isSignedIn} = useAuth()

    const {
    loading: isToggling,
    fn: toggleSavedCarFn,
    data: toggleResult,
    error: toggleError,
  } = useFetch(toggleSavedCar);

  
  useEffect(() => {
    if (toggleResult?.success && toggleResult.saved !== isSaved) {
      setIsSaved(toggleResult.saved);
      toast.success(toggleResult.message);
    }
  }, [toggleResult, isSaved]);


  useEffect(() =>{
    if (toggleError){
      toast.error("Failed to update favorites")
    }
  })

  const handleToggleSave = async (e) => {
    e.preventDefault();

    if (!isSignedIn) {
      toast.error("Please sign in to save cars");
      router.push("/sign-in");
      return;
    }

    if (isToggling) return;

    const result = await toggleSavedCarFn(car.id);
  }

  return <Card className="overflow-hidden shadow-xl border border-gray-100 rounded-2xl bg-gradient-to-br from-white via-gray-50 to-gray-100 transition group hover:scale-[1.015] hover:shadow-2xl">
    <div className='relative h-52'>
        {car.images && car.images.length > 0 ?(
       <div className="relative w-full h-full">
        <Image src={car.images[0] || "/logo.png"}
        alt={`${car.make} ${car.model}`}
        fill
        className="object-cover group-hover:scale-110 transition duration-500 rounded-t-2xl"
        />
       </div>
    
    ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-t-2xl">
            <CarIcon className="h-14 w-14 text-gray-300" />
          </div>
        )}

        <Button variant="ghost" size="icon" className={`absolute top-3 right-3 bg-white/90 rounded-full p-2 shadow-md border border-gray-100 transition-all ${
            isSaved
              ? "text-red-500 hover:text-red-600"
              : "text-gray-600 hover:text-gray-900"
        }`}
         onClick={handleToggleSave}
          >
            {isToggling? (
              <Loader2 className='h-4 w-4 animate-spin'/>
            ) :(
              
              <Heart className={isSaved ? "fill-current" : " "} size={22} /> 
            )}
                  
        </Button>
    </div>
    <CardContent className="p-5">
        <div className='flex flex-col mb-2'>
            <h3 className='text-xl font-bold line-clamp-1 text-gray-900'>{car.make} {car.model}</h3>
            <span className='text-2xl font-extrabold text-cyan-600 drop-shadow-sm'>{formatCurrency(car.price)}</span>
        </div>
        <div className="text-gray-600 mb-3 flex items-center text-base font-medium">
          <span>{car.year}</span>
          <span className="mx-2">•</span>
          <span className="capitalize">{car.transmission}</span>
          <span className="mx-2">•</span>
          <span className="capitalize">{car.fuelType}</span>
        </div>

         <div className="flex flex-wrap gap-2 mb-5">
          <Badge variant="outline" className="bg-gray-50 rounded-full px-3 py-1 text-gray-700 font-semibold shadow-sm">
            {car.bodyType}
          </Badge>
          <Badge variant="outline" className="bg-gray-50 rounded-full px-3 py-1 text-gray-700 font-semibold shadow-sm">
            {car.mileage.toLocaleString()} miles
          </Badge>
          <Badge variant="outline" className="bg-gray-50 rounded-full px-3 py-1 text-gray-700 font-semibold shadow-sm">
            {car.color}
          </Badge>
        </div>

        <div className="flex justify-between">
          <Button
            className="flex-1 font-bold py-2 cursor-pointer rounded-xl hover:bg-black text-white shadow-md transition-all bg-gradient-to-r from-[#2af598] to-[#009efd] hover:from-gray-950 hover:to-gray-800"
            onClick={() => {
              router.push(`/cars/${car.id}`);
            }}
          >
            View Car
          </Button>
        </div>
    </CardContent>
  </Card>
}

export default CarCard