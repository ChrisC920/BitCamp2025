import React, { useRef, useEffect } from "react";

const StarfieldBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const numStars = 200;
        const stars = [];

        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width - width / 2,
                y: Math.random() * height - height / 2,
                z: Math.random() * width,
            });
        }

        const animate = () => {
            ctx.fillStyle = "#000"; // full black bg
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < numStars; i++) {
                let star = stars[i];
                star.z -= 5;

                if (star.z <= 0) {
                    star.z = width;
                }

                const k = 128.0 / star.z;
                const x = star.x * k + width / 2;
                const y = star.y * k + height / 2;

                if (x >= 0 && x <= width && y >= 0 && y <= height) {
                    const size = (1 - star.z / width);
                    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            requestAnimationFrame(animate);
        };

        animate();

        window.addEventListener("resize", () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 0,
                width: "100%",
                height: "100%",
            }}
        />
    );
};

export default StarfieldBackground;
