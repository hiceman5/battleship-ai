# Battleship Specification

Board 10x10, columns A-J, rows 1-10
Fleet: Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2
Placement: horizontal or vertical only, no overlap, no out of bounds. State explicitly whether ships may touch. Pick one and say so.
Turn order, what happens on a hit, what a repeat shot on an already-fired cell does
Sunk detection and reveal rules, what the player sees of the AI fleet before game over
AI behavior, written out: parity search until a hit, hunt mode probing orthogonal neighbors, target mode extending along the confirmed axis, hunt state resetting correctly on a sink
Win condition, game over screen, replay
Accessibility: keyboard grid navigation, aria labels, colorblind-safe hit/miss markers
Visual spec with actual colors, spacing, and typography. Devin will not invent aesthetics
