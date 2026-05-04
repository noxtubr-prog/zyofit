import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Scissors, Ruler, CreditCard, Package, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const steps = [
  { icon: Search, title: "Browse Tailors", description: "Explore verified tailors near you. Filter by location, rating, and specialty to find the perfect match." },
  { icon: Scissors, title: "Select Service", description: "Choose from a wide range of stitching services — blouses, suits, sherwanis, lehengas, and more." },
  { icon: Ruler, title: "Enter Measurements", description: "Provide your body measurements or upload a measurement sheet. Accurate measurements ensure the perfect fit." },
  { icon: CreditCard, title: "Pay Securely", description: "Complete your order with secure online payment. Your money is held safely until the order is delivered." },
  { icon: Package, title: "Receive Custom Stitching", description: "Your tailor crafts your garment with care. Track your order in real-time and receive it at your doorstep." },
];

const HowItWorks = () => {
  return (
    <>
      <title>How It Works - ZyloFit | Custom Tailoring Made Simple</title>
      <meta name="description" content="Learn how ZyloFit connects you with expert tailors for custom stitching in 5 simple steps." />

      <section className="container py-16 md:py-24">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
        >
          <h1 className="text-3xl md:text-5xl font-bold">
            How <span className="text-gradient">ZyloFit</span> Works
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Getting custom-stitched clothing has never been easier. Follow these five simple steps.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                className="bg-card rounded-2xl p-6 md:p-8 card-shadow flex items-start gap-5 border border-transparent hover:border-primary/30 transition-colors"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={index}
              >
                <div className="flex-shrink-0 h-14 w-14 rounded-2xl accent-gradient flex items-center justify-center">
                  <Icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                      Step {index + 1}
                    </span>
                    <h2 className="text-xl font-bold">{step.title}</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/browse">
            <Button size="lg" className="btn-glow">
              Browse Tailors <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>
    </>
  );
};

export default HowItWorks;
