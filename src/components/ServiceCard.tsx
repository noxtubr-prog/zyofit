import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Service } from "@/lib/data";
import { ShoppingCart, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ServiceCard = ({ service }: { service: Service }) => {
  const { addItem } = useCart();

  return (
    <div className="bg-card rounded-2xl overflow-hidden card-shadow card-hover-lift border border-transparent group flex flex-col">
      <div className="relative overflow-hidden">
        <img
          src={service.image}
          alt={`${service.name} service`}
          className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <Badge className="absolute top-3 left-3 accent-gradient border-0 text-accent-foreground">
          {service.category}
        </Badge>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <Link to={`/service/${service.id}`}>
          <h3 className="font-bold text-base text-card-foreground hover:text-accent transition-colors">{service.name}</h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{service.description}</p>
        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {service.estimatedDays} days
          <span className="mx-1">•</span>
          {service.tailorName}
        </div>
        <div className="flex items-center justify-between mt-auto pt-4 border-t">
          <span className="text-xl font-bold text-foreground">₹{service.price.toLocaleString()}</span>
          <Button size="sm" variant="accent" onClick={() => addItem(service)}>
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
