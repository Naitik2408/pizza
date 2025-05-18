export type Category = 'Pizza' | 'Burger' | 'Grilled Sandwich' | 'Special Combo' | 'Pasta' | 'Noodles' | 'Snacks' | 'Milkshake' | 'Cold Drink' | 'Rice Item' | 'Sweets' | 'Sides';
export type FoodType = 'Veg' | 'Non-Veg' | 'Not Applicable';
export type Size = 'Small' | 'Medium' | 'Large' | 'Not Applicable';

export interface SizeVariation {
  size: Size;
  price: number;
  available: boolean;
}

// First, add a new SizePricing interface
export interface SizePricing {
  size: Size;
  price: number;
}

// Then update the AddOn interface to include the new properties
export interface AddOn {
  id: string;
  name: string;
  price: number;
  available: boolean;
  isDefault: boolean; // For options like "Without Onion" that don't add price
  hasSizeSpecificPricing?: boolean; // Add this property
  sizePricing?: SizePricing[]; // Add this property
}

export interface AddOnGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  required: boolean;
  addOns: AddOn[];
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  available: boolean;
  popular: boolean;
  foodType: FoodType;
  size: Size;
  sizeVariations: SizeVariation[];
  hasMultipleSizes: boolean;
  rating: number;
  ratingCount: number;
  hasAddOns: boolean;
  addOnGroups: AddOnGroup[];
}