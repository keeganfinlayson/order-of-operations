# Math rendering contract

- `presentation.js` renders workspace, steps, and flying copies from the same expression tree. The interactive option adds target IDs and accessible controls; it must not change layout.
- `math.css` owns all mathematical typography. `style.css` owns the application layout and controls. Do not reintroduce math overrides there.
- Ordinary terms, grouped terms, and power bases share the text baseline. Parentheses are larger glyphs on that same baseline. Never use flex centering for an ordinary expression row.
- Exponents are positioned relative to their own base. Only fraction stacks use a centered mathematical axis.
- Scale by container font size; all internal spacing and positioning use em units.
- Multiplication notation and division notation are independent options. All six combinations must use the same renderer.
- Preserve drag target IDs, keyboard selection, sign distribution, and merge animations when changing markup.

Check `2(3+4)-7`, `2^3-4+3*2`, and `(38+34)/3+3^2`, with nested groups and fractions, in both workspace and steps after any typography change.
