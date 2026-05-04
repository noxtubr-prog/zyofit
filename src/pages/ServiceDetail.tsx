import { useParams, Link } from "react-router-dom";
import { services } from "@/lib/data";
import { ArrowLeft, Clock, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";

const ServiceDetail = () => {
  const { id } = useParams();
  const service = services.find(s => s.id === id);
  const { addItem } = useCart();

  if (!service) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground text-lg">Service not found.</p>
        <Link to="/browse"><Button variant="accent" className="mt-6">Browse Services</Button></Link>
      </div>
    );
  }

  const benefits = [
    "Custom measurements for perfect fit",
    "Premium fabric options available",
    "Expert craftsmanship guaranteed",
    "Free alterations within 7 days",
  ];

  return (
    <div className="container py-10">
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 font-medium">
        <ArrowLeft className="h-4 w-4" /> Back to Services
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="rounded-2xl overflow-hidden">
          <img src={service.image} alt={service.name} className="w-full h-72 md:h-[28rem] object-cover" />
        </div>

        <div className="flex flex-col">
          <Badge variant="secondary" className="mb-3 w-fit text-sm">{service.category}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold">{service.name}</h1>
          <p className="text-muted-foreground mt-2 text-base">by {service.tailorName}</p>

          <div className="flex items-center gap-5 mt-6">
            <span className="text-4xl font-bold text-accent">₹{service.price.toLocaleString()}</span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Est. {service.estimatedDays} days
            </span>
          </div>

          <p className="mt-6 text-base leading-relaxed text-muted-foreground">{service.description}</p>

          <div className="mt-8 space-y-3">
            <h3 className="font-semibold text-base">Custom-Fit Benefits</h3>
            {benefits.map(b => (
              <div key={b} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-accent flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8 flex gap-3">
            <Button variant="accent" size="xl" className="flex-1" onClick={() => addItem(service)}>
              <ShoppingCart className="h-5 w-5" /> Add to Cart
            </Button>
            <Link to="/cart">
              <Button variant="outline" size="xl">View Cart</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
