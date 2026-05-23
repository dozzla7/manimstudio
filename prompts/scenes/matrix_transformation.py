# Few-shot example: Matrix transformation
# Shows how to animate linear transformations

from manim import *

class MatrixTransformation(Scene):
    """
    Visualizes a 2D linear transformation applied to a shape.
    Shows how the matrix changes the coordinate space.
    """
    
    def construct(self):
        # Create a unit square
        square = Square(side_length=2, color=BLUE, fill_opacity=0.3)
        square.move_to(ORIGIN)
        
        # Add vectors at corners
        vectors = VGroup()
        for x, y in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
            vec = Arrow(
                start=ORIGIN, 
                end=np.array([x, y, 0]),
                color=YELLOW,
                buff=0
            )
            vectors.add(vec)
        
        # Show original square
        self.play(Create(square), Create(vectors))
        self.wait(0.5)
        
        # Define transformation matrix
        matrix = [[2, 1], [1, 2]]
        matrix_tex = MathTex(
            r"\begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}"
        ).to_corner(UL)
        
        self.play(Write(matrix_tex))
        self.wait(0.5)
        
        # Apply transformation (stretch and shear)
        transformed_square = square.copy().apply_matrix(matrix)
        transformed_vectors = vectors.copy()
        for vec in transformed_vectors:
            vec.apply_matrix(matrix)
        
        # Animate the transformation
        self.play(
            Transform(square, transformed_square),
            Transform(vectors, transformed_vectors),
            run_time=2
        )
        
        # Show determinant
        det_tex = MathTex(
            r"\det = 3", 
            color=GREEN
        ).next_to(matrix_tex, DOWN)
        
        self.play(Write(det_tex))
        self.wait(1)


# Key techniques demonstrated:
# 1. Creating and transforming shapes
# 2. Matrix representation with LaTeX
# 3. Applying linear transformations
# 4. Animated transformation transitions
