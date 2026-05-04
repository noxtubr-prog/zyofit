import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ShieldCheck,
  Ruler,
  Lock,
  PackageCheck,
  UserCheck,
  Scissors,
  ClipboardList,
  Truck,
  Sparkles,
} from "lucide-react";
import { tailors } from "@/lib/data";
import TailorCard from "@/components/TailorCard";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  { icon: ShieldCheck, title: "Verified Tailors", desc: "Every tailor is vetted and rated by real customers." },
  { icon: Ruler, title: "Custom Measurements", desc: "Submit your exact sizes for a perfect fit — every time." },
  { icon: Lock, title: "Secure Orders", desc: "Payments protected end-to-end with instant confirmation." },
  { icon: PackageCheck, title: "Easy Tracking", desc: "Live order status from stitching to delivery." },
];

const steps = [
  { icon: UserCheck, title: "Choose Tailor", desc: "Browse verified local tailors near you." },
  { icon: Scissors, title: "Select Service", desc: "Pick from blouses, suits, kurtas & more." },
  { icon: ClipboardList, title: "Enter Measurements", desc: "Share your sizes — or upload a photo." },
  { icon: Truck, title: "Get Delivered", desc: "Perfectly stitched, at your doorstep." },
];

const Index = () => {
  return (
    <>
      <title>ZyloFit — Find the Perfect Tailor Near You</title>
      <meta
        name="description"
        content="Custom stitching made easy, fast, and reliable. Connect with verified local tailors and get perfect-fit garments delivered."
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-[#0B0B0B]">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-emerald-600/20 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-emerald-400/10 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative container py-28 md:py-40">
          <motion.div
            className="max-w-3xl mx-auto text-center space-y-8"
            initial="hidden"
            animate="visible"
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-medium border border-emerald-500/20 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5" />
              India's premium custom tailoring platform
            </motion.span>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05]"
            >
              Find the Perfect{" "}
              <span className="bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                Tailor Near You
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg md:text-xl text-white/60 max-w-xl mx-auto leading-relaxed"
            >
              Custom stitching made easy, fast, and reliable.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
            >
              <Link to="/browse">
                <Button
                  size="xl"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-[0_0_40px_-8px_rgba(16,185,129,0.6)] hover:shadow-[0_0_60px_-6px_rgba(16,185,129,0.8)] transition-shadow"
                >
                  Browse Tailors <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/become-tailor">
                <Button
                  size="xl"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white backdrop-blur"
                >
                  Become a Tailor
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-[#0B0B0B] border-t border-white/5">
        <div className="container py-24">
          <motion.div
            className="text-center mb-14 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">Why ZyloFit</h2>
            <p className="text-white/50 mt-3">Crafted for a flawless tailoring experience, end to end.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -6 }}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-all hover:border-emerald-500/40 hover:bg-white/[0.05] hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 transition-colors">
                  <f.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-white/55 mt-2 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#0B0B0B] border-t border-white/5">
        <div className="container py-24">
          <motion.div
            className="text-center mb-16 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white">How it works</h2>
            <p className="text-white/50 mt-3">Four simple steps to your perfect fit.</p>
          </motion.div>

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* connector line */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative text-center"
              >
                <div className="relative mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 flex items-center justify-center mb-5 backdrop-blur">
                  <s.icon className="h-7 w-7 text-emerald-300" />
                  <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emerald-500 text-black text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-white/55 mt-2">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED TAILORS */}
      <section className="bg-[#0B0B0B] border-t border-white/5">
        <div className="container py-24">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Featured Tailors</h2>
              <p className="text-white/50 mt-2">Trusted by thousands of customers.</p>
            </div>
            <Link to="/browse">
              <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tailors.slice(0, 4).map((tailor, i) => (
              <motion.div
                key={tailor.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -6 }}
                className="transition-transform"
              >
                <TailorCard tailor={tailor} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0B0B0B] border-t border-white/5">
        <div className="container py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/40 via-[#0B0B0B] to-[#0B0B0B] p-12 md:p-20 text-center"
          >
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[600px] rounded-full bg-emerald-500/20 blur-[100px]" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                Start Your Perfect Fit Today
              </h2>
              <p className="text-white/60 mt-4 max-w-lg mx-auto">
                Thousands of customers. Hundreds of verified tailors. One perfect fit away.
              </p>
              <Link to="/browse">
                <Button
                  size="xl"
                  className="mt-8 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-[0_0_40px_-8px_rgba(16,185,129,0.6)]"
                >
                  Browse Tailors <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0B0B0B] border-t border-white/5">
        <div className="container py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <Scissors className="h-5 w-5 text-black" />
                </div>
                <span className="text-white font-bold text-lg">ZyloFit</span>
              </div>
              <p className="text-sm text-white/45 leading-relaxed">
                Smart fit. Seamless style. Custom tailoring, reimagined.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-white/50">
                <li><Link to="/how-it-works" className="hover:text-emerald-400 transition-colors">About</Link></li>
                <li><Link to="/how-it-works" className="hover:text-emerald-400 transition-colors">How it works</Link></li>
                <li><Link to="/become-tailor" className="hover:text-emerald-400 transition-colors">Become a Tailor</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Support</h4>
              <ul className="space-y-2.5 text-sm text-white/50">
                <li><a href="mailto:support@zylofit.com" className="hover:text-emerald-400 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Follow</h4>
              <ul className="space-y-2.5 text-sm text-white/50">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/40">© {new Date().getFullYear()} ZyloFit. All rights reserved.</p>
            <p className="text-xs text-white/40">Made with care in India.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Index;
