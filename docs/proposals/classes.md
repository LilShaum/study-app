# Classes: a sketch

For the owner. Your idea: organise by class, add to a class, and when a
test comes, pick from the class what's on it. Nothing is built yet; three
questions at the bottom.

## What there is now

A class is just the course code (say BIOC301). The library groups courses
by it and can filter to one class. An exam date set on one course can be
copied to the others with the same code. There is no page for a class.

## What I'd add

**1. A class page.** Tap a class name in the library to open it.

```
← Library

BIOC301
Biochemistry · 4 lectures · exam Fri 14 Nov

 I    Enzyme kinetics           151 items   ····  done
 II   Enzyme regulation          98 items   ····  half
 III  Glycolysis                120 items   ····  new
 IV   TCA cycle                 110 items   ····  new

[ Today ]   Set the exam   Add a lecture
```

- Lectures in order, each opening its own page as now.
- **Today** studies the whole class: the day's time shared across its
  lectures, nearest exam first (the same split the library already uses).
- **Add a lecture** is New course with BIOC301 filled in.

**2. One exam for the class.**

```
Exam for BIOC301
Date   [ Fri 14 Nov ]

What's on it
 [x] I   Enzyme kinetics       (all 11 sections)
 [x] II  Enzyme regulation     (all 8)
 [~] III Glycolysis            (4 of 9)  ▸
       [x] Overview  [x] Hexokinase  [ ] Pyruvate kinase ...
 [ ] IV  TCA cycle

            [ Save ]  Cancel
```

- Tick whole lectures, or open one and tick its sections.
- Save puts the date and the ticked sections on each lecture. A lecture
  you untick loses that exam date. Everything that plans your studying
  (Today, Review, the library's list) keeps working as it does now, so
  nothing about the scheduling changes.

## Your call

1. **Build it as sketched?** Or change anything first?
2. **"Course" or "lecture"?** Once classes exist, the thing made from one
   set of slides is really a lecture, and the class is the course. I'd
   rename it in the app to "lecture" (New lecture, Add a lecture, "4
   lectures"). Files stay `.study.json`. Yes or no?
3. **More than one exam per class** (a midterm and a final)? The sketch
   has one at a time: set the midterm, and after it, set the final.
   Two at once is more work; say if you need it.
