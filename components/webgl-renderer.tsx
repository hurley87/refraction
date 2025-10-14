"use client";

import { useEffect, useRef } from "react";
import heroData from "@/public/hero-web-gl.json";

/**
 * WebGL renderer component that interprets and renders shader-based animations
 * from the hero-web-gl.json configuration file
 */
export default function WebGLRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programsRef = useRef<WebGLProgram[]>([]);
  const frameBuffersRef = useRef<(WebGLFramebuffer | null)[]>([]);
  const texturesRef = useRef<WebGLTexture[]>([]);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const mouseRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
  }>({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL2 context
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    });

    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }

    glRef.current = gl;

    // Setup canvas size
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Mouse tracking with momentum
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
      mouseRef.current.targetY = 1.0 - (e.clientY - rect.top) / rect.height;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Initialize shaders and programs
    try {
      initializeWebGL(gl);
      render();
    } catch (error) {
      console.error("Failed to initialize WebGL:", error);
    }

    // Animation loop
    function render() {
      if (!glRef.current || !canvasRef.current) return;

      const gl = glRef.current;
      const canvas = canvasRef.current;
      const time = (Date.now() - startTimeRef.current) / 1000;

      // Smooth mouse movement with momentum
      const momentum = 0.1;
      mouseRef.current.x +=
        (mouseRef.current.targetX - mouseRef.current.x) * momentum;
      mouseRef.current.y +=
        (mouseRef.current.targetY - mouseRef.current.y) * momentum;

      // Render each layer
      const history = heroData.history || [];
      history.forEach((layer, index) => {
        if (!layer.visible) return;

        const program = programsRef.current[index];
        if (!program) return;

        gl.useProgram(program);

        // Bind framebuffer for this layer (null for final layer)
        const isLastLayer = index === history.length - 1;
        gl.bindFramebuffer(
          gl.FRAMEBUFFER,
          isLastLayer ? null : frameBuffersRef.current[index],
        );

        // Set uniforms
        const timeLocation = gl.getUniformLocation(program, "uTime");
        const mousePosLocation = gl.getUniformLocation(program, "uMousePos");
        const resolutionLocation = gl.getUniformLocation(
          program,
          "uResolution",
        );

        if (timeLocation) {
          gl.uniform1f(timeLocation, time * (layer.speed || 1));
        }
        if (mousePosLocation) {
          gl.uniform2f(
            mousePosLocation,
            mouseRef.current.x,
            mouseRef.current.y,
          );
        }
        if (resolutionLocation) {
          gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        }

        // Bind previous layer's texture if not the first layer
        if (index > 0) {
          const textureLocation = gl.getUniformLocation(program, "uTexture");
          if (textureLocation) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texturesRef.current[index - 1]);
            gl.uniform1i(textureLocation, 0);
          }
        }

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Initialize WebGL shaders, programs, and buffers
   */
  function initializeWebGL(gl: WebGL2RenderingContext) {
    const history = heroData.history || [];

    // Create vertex buffer (full-screen quad)
    const vertices = new Float32Array([
      -1, -1, 0, 0, 0, 1, -1, 0, 1, 0, -1, 1, 0, 0, 1, 1, 1, 0, 1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Process each layer
    history.forEach((layer, index) => {
      const vertexShaderSource = layer.compiledVertexShaders?.[0];
      const fragmentShaderSource = layer.compiledFragmentShaders?.[0];

      if (!vertexShaderSource || !fragmentShaderSource) {
        console.warn(`Missing shaders for layer ${index}`);
        return;
      }

      // Compile shaders
      const vertexShader = compileShader(
        gl,
        gl.VERTEX_SHADER,
        vertexShaderSource,
      );
      const fragmentShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentShaderSource,
      );

      if (!vertexShader || !fragmentShader) {
        console.error(`Failed to compile shaders for layer ${index}`);
        return;
      }

      // Create program
      const program = gl.createProgram();
      if (!program) return;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(program));
        return;
      }

      programsRef.current[index] = program;

      // Setup attributes
      gl.useProgram(program);

      const positionLocation = gl.getAttribLocation(program, "aVertexPosition");
      const texCoordLocation = gl.getAttribLocation(program, "aTextureCoord");

      if (positionLocation >= 0) {
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 20, 0);
      }

      if (texCoordLocation >= 0) {
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 20, 12);
      }

      // Setup matrices
      const mvMatrixLocation = gl.getUniformLocation(program, "uMVMatrix");
      const pMatrixLocation = gl.getUniformLocation(program, "uPMatrix");
      const textureMatrixLocation = gl.getUniformLocation(
        program,
        "uTextureMatrix",
      );

      if (mvMatrixLocation) {
        const mvMatrix = new Float32Array([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]);
        gl.uniformMatrix4fv(mvMatrixLocation, false, mvMatrix);
      }

      if (pMatrixLocation) {
        const pMatrix = new Float32Array([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]);
        gl.uniformMatrix4fv(pMatrixLocation, false, pMatrix);
      }

      if (textureMatrixLocation) {
        const textureMatrix = new Float32Array([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        ]);
        gl.uniformMatrix4fv(textureMatrixLocation, false, textureMatrix);
      }

      // Create texture and framebuffer for this layer (except last)
      if (index < history.length - 1) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.canvas.width,
          gl.canvas.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        texturesRef.current[index] = texture!;

        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          texture,
          0,
        );

        frameBuffersRef.current[index] = framebuffer;
      }
    });

    gl.clearColor(0, 0, 0, 0);
  }

  /**
   * Compile a WebGL shader
   */
  function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Cleanup WebGL resources
   */
  function cleanup() {
    const gl = glRef.current;
    if (!gl) return;

    programsRef.current.forEach((program) => {
      if (program) gl.deleteProgram(program);
    });

    texturesRef.current.forEach((texture) => {
      if (texture) gl.deleteTexture(texture);
    });

    frameBuffersRef.current.forEach((fb) => {
      if (fb) gl.deleteFramebuffer(fb);
    });

    programsRef.current = [];
    texturesRef.current = [];
    frameBuffersRef.current = [];
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
