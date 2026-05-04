import { Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ArrowLeft } from "lucide-react";

const Cart = () => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="container py-24 text-center">
        <ShoppingCart className="h-20 w-20 mx-auto text-muted-foreground/20" />
        <h1 className="text-2xl font-bold mt-6">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2 text-base">Browse services and add items to get started.</p>
        <Link to="/browse"><Button variant="accent" size="lg" className="mt-8">Browse Services <ArrowRight className="h-4 w-4" /></Button></Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 font-medium">
        <ArrowLeft className="h-4 w-4" /> Continue Shopping
      </Link>
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.service.id} className="bg-card rounded-2xl p-5 card-shadow flex gap-4">
              <img src={item.service.image} alt={item.service.name} className="h-24 w-24 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base">{item.service.name}</h3>
                <p className="text-sm text-muted-foreground">{item.service.tailorName}</p>
                <p className="font-bold text-lg mt-2">₹{item.service.price.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.service.id)} className="h-8 w-8">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.service.id, item.quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.service.id, item.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl p-6 card-shadow h-fit sticky top-24">
          <h2 className="font-bold text-xl mb-5">Order Summary</h2>
          {items.map(item => (
            <div key={item.service.id} className="flex justify-between text-sm py-2">
              <span className="text-muted-foreground">{item.service.name} × {item.quantity}</span>
              <span className="font-medium">₹{(item.service.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 flex justify-between font-bold text-xl">
            <span>Total</span>
            <span className="text-accent">₹{total.toLocaleString()}</span>
          </div>
          <Link to="/checkout">
            <Button variant="accent" className="w-full mt-6" size="xl">
              Proceed to Checkout <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
