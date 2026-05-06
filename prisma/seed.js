import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // create dealership info if not already present
  const existing = await prisma.dealershipInfo.findFirst();
  if (!existing) {
    await prisma.dealershipInfo.create({
      data: {
        name: "Veylo Inc.",
        address: "Kanpur, India",
        phone: "+91 7309548XXX",
        email: "contact@veylo.com",
        workingHours: {
          create: [
            { dayOfWeek: "MONDAY", openTime: "09:00", closeTime: "18:00" },
            { dayOfWeek: "TUESDAY", openTime: "09:00", closeTime: "18:00" },
            { dayOfWeek: "WEDNESDAY", openTime: "09:00", closeTime: "18:00" },
            { dayOfWeek: "THURSDAY", openTime: "09:00", closeTime: "18:00" },
            { dayOfWeek: "FRIDAY", openTime: "09:00", closeTime: "18:00" },
          ],
        },
      },
    });
  }

  // seed five sample cars
  const sampleCars = [
    {
      make: "Toyota",
      model: "Corolla",
      year: 2021,
      price: 18000.0,
      mileage: 25000,
      color: "White",
      fuelType: "Petrol",
      transmission: "Automatic",
      bodyType: "Sedan",
      seats: 5,
      description: "Well maintained Toyota Corolla with low mileage.",
      status: "AVAILABLE",
      featured: false,
      images: ["/logo.png"],
    },
    {
      make: "Honda",
      model: "Civic",
      year: 2020,
      price: 20000.0,
      mileage: 30000,
      color: "Black",
      fuelType: "Petrol",
      transmission: "Manual",
      bodyType: "Sedan",
      seats: 5,
      description: "Sporty Honda Civic in excellent condition.",
      status: "AVAILABLE",
      featured: true,
      images: ["/logo.png"],
    },
    {
      make: "Ford",
      model: "Mustang",
      year: 2019,
      price: 35000.0,
      mileage: 40000,
      color: "Red",
      fuelType: "Petrol",
      transmission: "Automatic",
      bodyType: "Coupe",
      seats: 4,
      description: "Classic Ford Mustang, perfect for collectors.",
      status: "AVAILABLE",
      featured: true,
      images: ["/logo.png"],
    },
    {
      make: "Tesla",
      model: "Model 3",
      year: 2022,
      price: 45000.0,
      mileage: 10000,
      color: "Blue",
      fuelType: "Electric",
      transmission: "Automatic",
      bodyType: "Sedan",
      seats: 5,
      description: "Electric efficiency with the Tesla Model 3.",
      status: "AVAILABLE",
      featured: false,
      images: ["/logo.png"],
    },
    {
      make: "BMW",
      model: "X5",
      year: 2021,
      price: 60000.0,
      mileage: 20000,
      color: "Grey",
      fuelType: "Diesel",
      transmission: "Automatic",
      bodyType: "SUV",
      seats: 5,
      description: "Luxurious BMW X5 with advanced features.",
      status: "AVAILABLE",
      featured: false,
      images: ["/logo.png"],
    },
  ];

  // createMany will insert all sample cars and skip duplicates if run multiple times
  await prisma.car.createMany({
    data: sampleCars,
    skipDuplicates: true,
  });

  // optionally seed some sample users
  const sampleUsers = [
    { clerkUserId: "user1", email: "alice@example.com", name: "Alice" },
    { clerkUserId: "user2", email: "bob@example.com", name: "Bob" },
    { clerkUserId: "user3", email: "carol@example.com", name: "Carol" },
    { clerkUserId: "user4", email: "dave@example.com", name: "Dave" },
    { clerkUserId: "user5", email: "eve@example.com", name: "Eve" },
  ];

  await prisma.user.createMany({
    data: sampleUsers,
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // ensures the Prisma Client is disconnected even if an error occurs
    await prisma.$disconnect();
  });
