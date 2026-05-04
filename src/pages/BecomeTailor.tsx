import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Store, IndianRupee, Users, ShieldCheck, TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const benefits = [
  { icon: Users, title: "Reach Thousands", desc: "Get discovered by customers looking for custom tailoring in your area." },
  { icon: IndianRupee, title: "Earn More", desc: "Set your own prices and grow your business with a steady flow of orders." },
  { icon: ShieldCheck, title: "Secure Payments", desc: "Get paid securely through our platform. No chasing payments." },
  { icon: TrendingUp, title: "Grow Your Brand", desc: "Build your online presence with ratings, reviews, and a dedicated store page." },
];

const BecomeTailor = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handlePrimaryCta = async () => {
    console.log("[become-tailor] click. user:", user?.id, "role:", role);
    if (!user) {
      navigate("/signup");
      return;
    }
    if (role === "tailor") {
      navigate("/tailor/dashboard");
      return;
    }
    if (role === "admin") {
      toast.info("Admin accounts cannot be converted to tailor.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc("become_tailor" as any);
    setSubmitting(false);

    if (error) {
      console.error("[become-tailor] rpc error", error);
      toast.error(error.message || "Could not switch role");
      return;
    }
    console.log("[become-tailor] role upgraded to tailor");
    toast.success("You're now a tailor! Set up your store to get started.");
    // Force a fresh page load so useUserRole + ProtectedRoute pick up the new role
    window.location.assign("/tailor/store");
  };

  const ctaLabel = !user
    ? "Register Now"
    : role === "tailor"
    ? "Go to Tailor Dashboard"
    : "Become a Tailor";

  return (
    <>
      <title>Become a Tailor - ZyloFit | Grow Your Tailoring Business</title>
      <meta name="description" content="Join ZyloFit as a tailor. Reach thousands of customers, manage orders online, and grow your tailoring business." />

      <section className="container py-16 md:py-24">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
        >
          <div className="h-16 w-16 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-6">
            <Store className="h-8 w-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold">
            Grow Your Business with <span className="text-gradient">ZyloFit</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Register as a tailor, set up your online store, and start accepting orders from customers across your city.
          </p>
          <Button size="xl" className="mt-8" onClick={handlePrimaryCta} disabled={submitting}>
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{ctaLabel} <ArrowRight className="h-5 w-5" /></>}
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                className="bg-card rounded-2xl p-6 card-shadow border border-transparent hover:border-accent/30 transition-colors"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-bold text-lg mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="mt-20 hero-gradient rounded-3xl p-12 text-center border border-accent/20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground">Ready to get started?</h2>
          <p className="text-primary-foreground/70 mt-3 max-w-md mx-auto">
            It takes less than 5 minutes to create your store. Start receiving orders today.
          </p>
          <Button variant="accent" size="xl" className="mt-6" onClick={handlePrimaryCta} disabled={submitting}>
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{ctaLabel} <ArrowRight className="h-5 w-5" /></>}
          </Button>
        </motion.div>

        {user && role === "customer" && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Signed in as <span className="font-medium">{user.email}</span> — clicking above will upgrade your account to a tailor.
          </p>
        )}
      </section>
    </>
  );
};

export default BecomeTailor;
