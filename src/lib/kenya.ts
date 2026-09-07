// Shared Kenya counties + Google-Business-Profile-inspired business types.

export const KENYA_COUNTIES = [
  "Mombasa","Kwale","Kilifi","Tana River","Lamu","Taita/Taveta","Garissa","Wajir",
  "Mandera","Marsabit","Isiolo","Meru","Tharaka-Nithi","Embu","Kitui","Machakos",
  "Makueni","Nyandarua","Nyeri","Kirinyaga","Murang'a","Kiambu","Turkana","West Pokot",
  "Samburu","Trans Nzoia","Uasin Gishu","Elgeyo/Marakwet","Nandi","Baringo","Laikipia",
  "Nakuru","Narok","Kajiado","Kericho","Bomet","Kakamega","Vihiga","Bungoma","Busia",
  "Siaya","Kisumu","Homa Bay","Migori","Kisii","Nyamira","Nairobi City",
] as const;

export type County = (typeof KENYA_COUNTIES)[number];

export const BUSINESS_TYPES = [
  "Retail Store","Online Store","Marketplace Seller","Wholesaler","Distributor",
  "Manufacturer","Supplier","General Merchant","Hardware Store","Building Materials Supplier",
  "Furniture Store","Home Goods Store","Electronics Store","Appliance Store",
  "Phone and Accessories Store","Computer Store","Clothing Store","Shoe Store",
  "Beauty and Cosmetics Store","Supermarket","Mini Mart","Grocery Store","Butchery",
  "Food Supplier","Restaurant","Fast Food Restaurant","Catering Business","Bakery",
  "Coffee Shop","Hotel","Guest House","Barbershop","Salon","Spa","Cleaning Service",
  "Laundry Service","Car Dealer","Car Accessories Store","Motorcycle Dealer",
  "Motorcycle Accessories Store","Auto Parts Store","Garage / Auto Repair Shop",
  "Vehicle Tracking Service","Logistics Company","Courier Service","Transport Service",
  "Real Estate Agency","Property Management Company","Construction Company",
  "Interior Design Company","Metal Fabrication Business","Welding Business",
  "Jua Kali Business","Kitchen Equipment Supplier","Restaurant Equipment Supplier",
  "Food Vending Equipment Supplier","Storage and Display Supplier",
  "Custom Fabrication Business","EX-UK Products Seller","Second-Hand Products Seller",
  "Importer","Exporter","Printing Service","Branding Service","Digital Marketing Agency",
  "Photography Studio","Videography Service","Event Planner","Event Equipment Supplier",
  "Training Institution","School","College","Professional Services","Consultant",
  "Legal Services","Accounting Services","Insurance Agency","Financial Services",
  "Microfinance","SACCO","Medical Clinic","Pharmacy","Dental Clinic","Veterinary Service",
  "Agriculture Supplier","Animal Feed Supplier","Farm Equipment Supplier","Other",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];