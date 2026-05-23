# Few-shot example: Derivatives visualization
# Shows how to animate the concept of derivatives

from manim import *

class DerivativeVisualization(Scene):
    """
    Visualizes the concept of a derivative as the slope of a tangent line.
    Demonstrates 3Blue1Brown style with smooth transformations.
    """
    
    def construct(self):
        # Set up coordinate system
        axes = Axes(
            x_range=[-1, 5],
            y_range=[-1, 4],
            axis_config={"color": GREY_A},
            tips=False
        )
        
        # Create the function y = x^2
        graph = axes.plot(lambda x: x**2, color=BLUE, x_range=[-0.5, 3])
        graph_label = MathTex("y = x^2", color=BLUE).to_edge(UR)
        
        # Animate axes and graph appearing
        self.play(Create(axes), run_time=1)
        self.play(Create(graph), Write(graph_label), run_time=1)
        self.wait(0.5)
        
        # Show the derivative at x = 2
        x_val = 2
        point = axes.c2p(x_val, x_val**2)
        dot = Dot(point, color=YELLOW)
        
        # Create tangent line
        tangent = axes.get_tangent_line(x_val, graph, color=YELLOW)
        
        # Show point and tangent
        self.play(FadeIn(dot, scale=0.5))
        self.play(Create(tangent))
        
        # Calculate and show derivative
        slope = 2 * x_val  # derivative of x^2 is 2x
        slope_tex = MathTex(
            r"\frac{dy}{dx} = 2x = 4", 
            color=YELLOW
        )
        slope_tex.to_edge(UP)
        
        self.play(Write(slope_tex))
        self.wait(1)
        
        # Animate the tangent point moving
        moving_dot = Dot(point, color=RED)
        self.add(moving_dot)
        self.remove(dot)
        
        def update_tangent(mob, alpha):
            new_x = 1 + 2 * alpha  # Move from x=1 to x=3
            new_point = axes.c2p(new_x, new_x**2)
            mob.move_to(new_point)
            return mob
        
        self.play(
            UpdateFromAlphaFunc(moving_dot, update_tangent),
            run_time=2
        )
        
        self.wait(1)


# Key techniques demonstrated:
# 1. Axes creation with custom styling
# 2. Plotting mathematical functions
# 3. Tangent line visualization
# 4. LaTeX labels with MathTex
# 5. Smooth point animation along a curve
