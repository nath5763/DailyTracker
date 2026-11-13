# Daily Letter Bag — Game Rules

## Objective

Earn the highest score possible by forming valid words from a limited supply of 30 letters. There is no time limit.

## Daily Puzzle

- A new puzzle is generated each day.
- Each puzzle contains **30 letters total**, arranged in a predetermined order.
- All players receive the **same daily puzzle**, including the same initial letters and replacement-letter order, to allow fair score comparisons.
- Letters are generated using rules designed to balance vowels and consonants and provide a reasonable variety of possible words, rather than using unrestricted randomness.

## Starting the Game

- The player begins with **15 playable letters**.
- The remaining **15 letters** form a hidden draw bag.
- The **next 5 letters** in the draw order are visible as a preview, but cannot be used until drawn.
- The remaining letters beyond the preview stay hidden.
- The game begins when the player presses **Start**. There is no countdown.

## Forming Words

1. Create a valid word using only letters currently in your playable rack.
2. Each letter tile may be used **at most once per word**, unless the rack contains multiple copies of that letter.
3. On a valid submission, the word earns points and its letter tiles are consumed.
4. **Each consumed letter is immediately replaced** by the next letter from the draw bag, in order, until the bag is empty. The rack refills toward 15 letters; it does not grow beyond 15.
5. The five-letter preview advances as replacement letters are drawn, revealing the next available letters. When fewer than five letters remain in the bag, show only those remaining.
6. Once the draw bag is empty, consumed letters are no longer replaced.

## Scoring

Each valid word earns **1 base point**, plus points for every letter position in the word:

- First letter: 1 point
- Second letter: 2 points
- Third letter: 3 points
- Continue increasing by 1 point for each additional letter.

**Base formula:** `Base Score = 1 + (word length × (word length + 1) / 2)`

| Word length | Base points |
| --- | ---: |
| 3 letters | 7 |
| 4 letters | 11 |
| 5 letters | 16 |
| 6 letters | 22 |
| 7 letters | 29 |
| 8 letters | 37 |
| 9 letters | 46 |
| 10 letters | 56 |

For example, a five-letter word earns `1 + 1 + 2 + 3 + 4 + 5 = 16` points.

Each Q or Z adds 2 bonus points. Each J, X, K, or V adds 1 bonus point. Every occurrence counts, including duplicate letters. The total word score is the base score plus all letter bonuses. CAT scores 7, JAM 8, ZIP 9, JAZZ 16, QUIZ 15, and PLANT 16.

The **final score** is the total points earned from all accepted words in the attempt. Longer words earn progressively more points, rewarding careful use of the limited letters.

## Ending the Game

- The player can finish explicitly at any time after starting.
- The game also ends when fewer than three letters remain available to make a word.
- A lack of an immediately valid word does not end the game automatically.
- Players compete on the daily leaderboard by highest total points. Equal scores share the same rank; completion time is not used.

## Additional Rules

- **Minimum word length:** 3 letters.
- **Repeated words:** The same word cannot score twice in one attempt.
- **Invalid submissions:** Earn no points and do not consume letters.
- **Letter swaps:** None.
- **Ranked attempts:** One per player per day.
- **Leaderboard tie-break:** None; equal scores share a rank.
- **Daily reset:** Midnight UTC.

The separate Endless Draw practice mode keeps its 90-second timer and continuing tile supply.

