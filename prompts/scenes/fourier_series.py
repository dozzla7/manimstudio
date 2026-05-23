# Few-shot example: Fourier series approximation
# Shows how to build up a square wave from sines

from manim import *

class FourierSeries(Scene):
    """
    Visualizes how a square wave is built from sinusoidal components.
    Demonstrates the Fourier series approximation.
    """
    
    def construct(self):
        # Create axes
        axes = Axes(
            x_range=[-2 * PI, 2 * PI, PI/2],
            y_range=[-1.5, 1.5, 0.5],
            x_length=10,
            y_length=4,
            axis_config={"color": GREY_A},
            tips=False
        )
        
        self.play(Create(axes))
        
        # Target: square wave approximation
        def square_wave(x):
            return 1 if (x % (2*PI) < PI) else -1
        
        # Fourier series approximation
        def fourier_approx(x, n_terms):
            result = 0
            for k in range(1, n_terms + 1):
                result += (4 / PI) * np.sin((2*k - 1) * x) / (2*k - 1)
            return result
        
        # Start with 1 term
        n_terms = 1
        graph = axes.plot(
            lambda x: fourier_approx(x, n_terms),
            color=BLUE,
            x_range=[-2*PI, 2*PI]
        )
        
        label = MathTex(f"n = {n_terms}").to_corner(UR)
        
        self.play(Create(graph), Write(label))
        
        # Animate adding more terms
        for n in [3, 5, 10, 20]:
            new_graph = axes.plot(
                lambda x, nn=n: fourier_approx(x, nn),
                color=BLUE,
                x_range=[-2*PI, 2*PI]
            )
            new_label = MathTex(f"n = {n}").to_corner(UR)
            
            self.play(
                Transform(graph, new_graph),
                Transform(label, new_label),
                run_time=1
            )
            self.wait(0.3)
        
        # Show the square wave target
        square = axes.plot(
            square_wave,
            color=YELLOW,
            x_range=[-2*PI, 2*PI],
            use_vectorized=False
        )
        
        self.play(
            Create(square),
            graph.animate.set_color(GREEN)
        )
        
        formula = MathTex(
            r"f(x) = \frac{4}{\pi}\sum_{k=1}^{\infty} \frac{\sin((2k-1)x)}{2k-1}"
        ).to_edge(DOWN)
        
        self.play(Write(formula))
        self.wait(1)


# Key techniques demonstrated:
# 1. Creating axes with custom ranges
# 2. Plotting mathematical functions
# 3. Animating function transformations
# 4. Building up complex formulas
# 5. Series visualization
