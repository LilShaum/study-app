# Swipes in a sitting on a phone

The owner, 2026-11-25, on the first build: "it seems counter intuitive that
got it is on the left side of the screen but you swipe right to say you got
it, but then you can also swipe to go to the next card in general. This
needs a lot more testing … see if it's worth keeping the swiping for
certain things or not. Like does it add enough to wanna work on keeping it
or does it not make sense for certain things, that's for you to explore."

## How to decide

- **What a swipe is for on a phone**: one hand, a thumb, a few minutes on a
  bus. A swipe is worth having where it is faster than reaching a button
  and cannot be mistaken for something else.
- **What was built**: two swipes. Once an answer shows, left for the next
  card and right for back; on a flipped flashcard, right for Got it and
  left for Missed it.
- **What is wrong with it** (the owner, and walking it): left means two
  things (next, and Missed it), so a student has to know which card they
  are on to know what a swipe does. The verdict swipe runs against the
  buttons (Got it sits on the left, its swipe goes right). And a verdict is
  a judgement about what you knew: given by a stray thumb, it moves the
  schedule for the wrong reason.
- **What a swipe saves**: the bottom bar already puts Next under the thumb.
  So a swipe saves little time; what it adds is feel: turning a page, which
  is the book the app is set as.

## The options

- **A. Keep both, and swap Got it and Missed it** so each swipe points at
  its button. For: fastest flashcards. Against: left still means two
  things; the buttons' order (Got it, Hard, Missed it) is the order they
  are read in and match G, H, M; and a verdict by accident still costs a
  wrong schedule.
- **B. One swipe, one meaning: turn the page.** Once an answer shows, left
  turns to the next card and right turns back, everywhere, with the card
  sliding off like a page so the gesture is seen to work. A flashcard's
  verdict is a tap. For: never ambiguous, nothing judged by accident, the
  book's own gesture. Against: flashcards keep their taps.
- **C. Only the verdict swipe on flashcards.** For: the classic flashcard
  app gesture. Against: the most error-prone one kept, and a gesture that
  works on one kind of card only is one to learn and forget.
- **D. No swipes.** For: nothing to learn, nothing by accident. Against:
  turning a page is the one gesture a reader of a book on a phone already
  makes, and it costs nothing where it cannot misfire.

## The pick: B

It is the only one where a swipe always means the same thing, and it never
decides anything about what the student knew. The page turn is kept only
where it cannot misfire: never on a question still waiting for its answer,
never starting in a field, a button or a link, never from a sideways scroll
(a wide table or formula scrolls itself), and only a mostly-sideways move.
Prev and Next stay in the bottom bar, so the swipe is never the only way.

Tested on emulated touch (Chromium, 390×844, touch events through the
DevTools protocol), on a multiple-choice sitting: a swipe on a question
still waiting does nothing; once answered, left turns to the next card and
right back; a vertical drag scrolls the page (396px) and turns nothing; a
50px flick does nothing. The test found one fault, fixed: an answered
card's options are buttons over most of the card, and a swipe that began on
one was ignored; disabled buttons now let it start. Not yet on a real
iPhone: Safari may not deliver touches that begin on a disabled button, so
the swipe there may only work from the card's question or its margins.
That is for the owner's phone and P4-3.
