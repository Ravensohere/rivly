import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[hsl(260,30%,12%)] to-[hsl(260,25%,18%)]"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Ambient glow behind orb */}
      <motion.div
        className="absolute w-64 h-64 rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, hsl(270, 60%, 70%) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main orb */}
      <motion.div
        className="relative w-24 h-24"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Outer ring glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, hsl(280, 50%, 75%) 0%, hsl(260, 50%, 60%) 100%)",
            filter: "blur(8px)",
          }}
          animate={{
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Main orb body */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: "linear-gradient(145deg, hsl(280, 45%, 70%) 0%, hsl(260, 50%, 55%) 50%, hsl(250, 40%, 40%) 100%)",
            boxShadow: "inset 0 -8px 20px hsl(260, 40%, 30%), inset 0 4px 12px hsl(280, 50%, 80%)",
          }}
        />

        {/* Inner highlight */}
        <motion.div
          className="absolute top-4 left-4 w-6 h-6 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(280, 60%, 85%) 0%, transparent 70%)",
          }}
          animate={{
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Pulse rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-[hsl(270,50%,70%)]"
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{
              scale: [1, 1.8, 2.2],
              opacity: [0.4, 0.15, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 0.8,
            }}
          />
        ))}
      </motion.div>

      {/* App name */}
      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <h1 className="text-2xl font-medium tracking-wide text-white/90">
          Rivly
        </h1>
        <motion.p
          className="mt-2 text-sm text-white/50"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Plan · Focus · Rest
        </motion.p>
      </motion.div>
    </div>
  );
}
