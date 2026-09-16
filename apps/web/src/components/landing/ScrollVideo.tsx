
import { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

export function ScrollVideo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Number of frames in the video
  const frameCount = 30;
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Load images
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      // Placeholder path - user will need to replace this
      // Format: /frames/frame_01.jpg, /frames/frame_02.jpg, etc.
      img.src = `/frames/frame_${i.toString().padStart(2, '0')}.jpg`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === frameCount) {
          setImagesLoaded(true);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, []);

  const renderFrame = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !images[index]) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image maintaining aspect ratio and covering the canvas (like object-fit: cover)
    const img = images[index];
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  };

  // Resize canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update frame on scroll
  useEffect(() => {
    if (!imagesLoaded) return;

    const unsubscribe = scrollYProgress.on("change", (latest) => {
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(latest * frameCount)
      );
      requestAnimationFrame(() => renderFrame(frameIndex));
    });

    return () => unsubscribe();
  }, [scrollYProgress, imagesLoaded]);

  return (
    <div ref={containerRef} className="h-[300vh] relative z-0">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Content that fades out */}
        <motion.div 
          style={{ opacity: useTransform(scrollYProgress, [0, 0.2], [1, 0]) }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="text-center text-white p-6 max-w-4xl">
            <h1 className="text-8xl md:text-9xl font-black tracking-tighter mb-6 mix-blend-difference">
              Rhythm
            </h1>
            <p className="text-xl md:text-2xl font-light tracking-wide mix-blend-difference opacity-80">
              Not speed.
            </p>
          </div>
        </motion.div>

        {/* Overlay Content that fades in at the end */}
        <motion.div 
          style={{ opacity: useTransform(scrollYProgress, [0.8, 1], [0, 1]) }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="text-center text-white p-6">
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 mix-blend-difference">
              Flow
            </h2>
          </div>
        </motion.div>

        {!imagesLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background text-foreground z-50">
             <div className="text-center space-y-4">
                <div className="text-2xl font-bold">Loading Experience...</div>
                <div className="text-sm text-muted-foreground">(Developer: Add images to /public/frames/)</div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
