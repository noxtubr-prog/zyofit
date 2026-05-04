import { Link } from "react-router-dom";
import { Star, MapPin, Clock, ArrowRight } from "lucide-react";
import { Tailor } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TailorCard = ({ tailor }: { tailor: Tailor }) => {
  const startingPrice = Math.min(...tailor.services.map(s => s.price));

  return (
    <div className="bg-card rounded-2xl p-5 card-shadow card-hover-lift border border-transparent flex flex-col">
      <div className="flex items-start gap-4">
        <img
          src={tailor.image}
          alt={`${tailor.name} - tailor profile`}
          className="h-16 w-16 rounded-xl object-cover ring-2 ring-border flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-card-foreground truncate">{tailor.shopName}</h3>
          <p className="text-sm text-muted-foreground">{tailor.name}</p>
          <div className="flex items-center gap-1 mt-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {tailor.location}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t">
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-accent text-accent" />
          <span className="font-bold text-sm">{tailor.rating}</span>
          <span className="text-xs text-muted-foreground">({tailor.reviewCount})</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {tailor.experience} yrs exp
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {tailor.specialties.slice(0, 3).map(s => (
          <Badge key={s} variant="secondary" className="text-xs font-medium">{s}</Badge>
        ))}
      </div>

      <div className="flex items-center justify-between mt-auto pt-4">
        <span className="text-sm text-muted-foreground">From <span className="font-bold text-foreground text-base">₹{startingPrice.toLocaleString()}</span></span>
        <Link to={`/tailor/${tailor.id}`}>
          <Button variant="accent" size="sm">
            View Profile <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default TailorCard;
