export interface Tailor {
  id: string;
  name: string;
  shopName: string;
  location: string;
  rating: number;
  reviewCount: number;
  experience: number;
  image: string;
  description: string;
  services: Service[];
  specialties: string[];
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  tailorId: string;
  tailorName: string;
  estimatedDays: number;
}

export interface CartItem {
  service: Service;
  quantity: number;
  size: string;
  notes: string;
}

export interface Order {
  id: string;
  date: string;
  status: "placed" | "measurements" | "stitching" | "delivery" | "delivered";
  items: { name: string; price: number }[];
  total: number;
  tailorName: string;
}

export const services: Service[] = [
  { id: "s1", name: "Blouse Stitching", category: "Women", price: 500, description: "Custom-fit blouse stitched to your exact measurements with premium finishing. Choose from a variety of neck designs, sleeve patterns, and back styles.", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=300&fit=crop", tailorId: "t1", tailorName: "Anita's Boutique", estimatedDays: 3 },
  { id: "s2", name: "Kurti Stitching", category: "Women", price: 800, description: "Elegant kurti tailored to perfection. Select from A-line, straight, or Anarkali styles with custom length and fitting.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&h=300&fit=crop", tailorId: "t1", tailorName: "Anita's Boutique", estimatedDays: 4 },
  { id: "s3", name: "Suit Stitching", category: "Men", price: 2500, description: "Premium suit stitching with Italian finishing. Includes jacket, trousers, and optional waistcoat with perfect drape and fit.", image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=300&fit=crop", tailorId: "t2", tailorName: "Royal Tailors", estimatedDays: 7 },
  { id: "s4", name: "Sherwani Stitching", category: "Men", price: 3500, description: "Handcrafted sherwani with intricate embroidery and perfect silhouette for weddings and special occasions.", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=300&fit=crop", tailorId: "t2", tailorName: "Royal Tailors", estimatedDays: 10 },
  { id: "s5", name: "Lehenga Stitching", category: "Women", price: 4000, description: "Bridal and festive lehenga with custom embroidery, cancan layering, and perfect waist fitting.", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&h=300&fit=crop", tailorId: "t3", tailorName: "Priya Fashion Studio", estimatedDays: 12 },
  { id: "s6", name: "Salwar Kameez", category: "Women", price: 1200, description: "Traditional salwar kameez set with dupatta. Choose Patiala, churidar, or palazzo style bottoms.", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=300&fit=crop", tailorId: "t3", tailorName: "Priya Fashion Studio", estimatedDays: 5 },
  { id: "s7", name: "Kurta Pajama", category: "Men", price: 1500, description: "Classic kurta pajama set with comfortable fit and premium cotton or silk fabric options.", image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=300&fit=crop", tailorId: "t4", tailorName: "Sahil Menswear", estimatedDays: 4 },
  { id: "s8", name: "Alterations & Repairs", category: "Unisex", price: 300, description: "Quick and precise alterations for any garment. Includes hemming, resizing, and button replacements.", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", tailorId: "t4", tailorName: "Sahil Menswear", estimatedDays: 2 },
];

export const tailors: Tailor[] = [
  {
    id: "t1", name: "Anita Sharma", shopName: "Anita's Boutique", location: "Lajpat Nagar, Delhi",
    rating: 4.8, reviewCount: 234, experience: 15,
    image: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&fit=crop&crop=face",
    description: "Specializing in women's ethnic wear with 15 years of experience. Known for perfect blouse fittings and elegant kurti designs.",
    services: services.filter(s => s.tailorId === "t1"),
    specialties: ["Blouse", "Kurti", "Lehenga"],
  },
  {
    id: "t2", name: "Mohammed Rafi", shopName: "Royal Tailors", location: "Chandni Chowk, Delhi",
    rating: 4.9, reviewCount: 412, experience: 25,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    description: "Master tailor with 25 years in premium men's wear. Expert in sherwanis and formal suits with Italian-style finishing.",
    services: services.filter(s => s.tailorId === "t2"),
    specialties: ["Suit", "Sherwani", "Blazer"],
  },
  {
    id: "t3", name: "Priya Desai", shopName: "Priya Fashion Studio", location: "Bandra, Mumbai",
    rating: 4.7, reviewCount: 189, experience: 12,
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face",
    description: "Creative designer-tailor specializing in bridal and festive wear. Combines traditional techniques with contemporary designs.",
    services: services.filter(s => s.tailorId === "t3"),
    specialties: ["Lehenga", "Salwar Kameez", "Bridal"],
  },
  {
    id: "t4", name: "Sahil Kumar", shopName: "Sahil Menswear", location: "MG Road, Bangalore",
    rating: 4.6, reviewCount: 156, experience: 10,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    description: "Young, innovative tailor focusing on modern men's ethnic and casual wear. Quick turnaround with quality craftsmanship.",
    services: services.filter(s => s.tailorId === "t4"),
    specialties: ["Kurta Pajama", "Alterations", "Casual"],
  },
];

export const sampleOrders: Order[] = [
  {
    id: "ORD-2024-001", date: "2024-12-15",
    status: "stitching",
    items: [{ name: "Blouse Stitching", price: 500 }, { name: "Kurti Stitching", price: 800 }],
    total: 1300, tailorName: "Anita's Boutique",
  },
  {
    id: "ORD-2024-002", date: "2024-12-10",
    status: "delivered",
    items: [{ name: "Suit Stitching", price: 2500 }],
    total: 2500, tailorName: "Royal Tailors",
  },
];

export const serviceCategories = [
  { name: "Women's Wear", icon: "👗", count: 4 },
  { name: "Men's Wear", icon: "🤵", count: 3 },
  { name: "Alterations", icon: "✂️", count: 1 },
  { name: "Bridal", icon: "💍", count: 2 },
];
