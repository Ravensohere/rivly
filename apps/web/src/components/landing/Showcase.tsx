
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, Clock, Sunset } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function Showcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !mockupRef.current) return;

    gsap.to(mockupRef.current, {
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 70%",
        end: "bottom 30%",
        scrub: 1.2,
      },
      backgroundColor: "#E0F2F1", // calm sage-ish
      borderColor: "#A8E0C2",
      duration: 2,
    });

    // Hover floats
    const tasks = mockupRef.current.querySelectorAll(".task");
    tasks.forEach((task) => {
      task.addEventListener("mouseenter", () => {
        gsap.to(task, { y: -8, scale: 1.03, duration: 0.4, ease: "power2.out" });
      });
      task.addEventListener("mouseleave", () => {
        gsap.to(task, { y: 0, scale: 1, duration: 0.4 });
      });
    });
  }, []);

  return (
    <section ref={sectionRef} className="min-h-screen flex items-center justify-center py-20 px-6 relative z-10">
      <div 
        ref={mockupRef} 
        className="w-full max-w-5xl border-2 border-gray-200/50 rounded-[3rem] overflow-hidden shadow-2xl bg-white/60 backdrop-blur-xl transition-colors duration-1000 p-8 md:p-12"
      >
        <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-8">
                <h3 className="text-4xl md:text-5xl font-bold text-indigo-950 leading-tight">Your day, gently reshaped.</h3>
                <p className="text-xl text-gray-600 font-light leading-relaxed">
                    No more endless lists. Rivly organizes your tasks into natural rhythms that respect your energy.
                </p>
                
                <div className="space-y-4">
                    <div className="task group bg-white p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-indigo-50 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block font-medium text-gray-800">Product Development Meet</span>
                            <span className="text-sm text-gray-500">10:00 AM • 45m</span>
                        </div>
                    </div>
                    
                    <div className="task group bg-white p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-indigo-50 flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <Check className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block font-medium text-gray-800">Deep work block</span>
                            <span className="text-sm text-gray-500">Focus Mode Active</span>
                        </div>
                    </div>
                    
                    <div className="task group bg-white p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-indigo-50 flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            <Sunset className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block font-medium text-gray-800">Evening reflection</span>
                            <span className="text-sm text-gray-500">Close the day efficiently</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 w-full relative h-[400px] md:h-[500px] bg-gradient-to-br from-indigo-50 to-white rounded-3xl border border-indigo-100/50 p-6 shadow-inner flex items-center justify-center">
                 {/* Abstract representation of the app interface */}
                 <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
                 <div className="text-center space-y-4">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-tr from-indigo-400 to-purple-400 rounded-full blur-2xl opacity-60 animate-pulse"></div>
                    <p className="text-sm font-medium text-indigo-400 uppercase tracking-widest">Live Preview</p>
                 </div>
            </div>
        </div>
      </div>
    </section>
  );
}
