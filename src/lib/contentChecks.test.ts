import { describe, expect, it } from 'vitest';
import { answeredBy, givesAway, sameFact } from './contentChecks';

describe('a definition that gives its term away', () => {
  it('catches a definition that spells out its term', () => {
    expect(givesAway('Root pressure', 'Pressure from the root that pushes water up the xylem from below.')).toBe(true);
    expect(givesAway('Guard cell', 'The cell on each side of a stoma that guards it by changing shape.')).toBe(true);
  });
  it('lets a definition that does not name it through', () => {
    expect(givesAway('Stoma', 'A pore in the leaf surface through which gases pass.')).toBe(false);
    expect(givesAway('Michaelis constant (Km)', 'The substrate concentration at which the reaction runs at half its maximum rate.')).toBe(false);
  });
});

describe('two cards that ask the same fact', () => {
  it('catches the same question in other words, and the same answer', () => {
    expect(
      sameFact(
        { question: 'What range do typical Km values fall in?', answer: '10⁻⁶ to 10⁻¹ M' },
        { question: 'Typical Km values for enzymes fall in which range?', answer: 'Micromolar to millimolar' },
      ),
    ).toBe(true);
    expect(sameFact({ question: 'Name the cell that opens and closes a stoma.', answer: 'Guard cell' }, { question: 'The cell that opens and closes a stoma.', answer: 'guard cell' })).toBe(true);
  });
  it('keeps different facts apart', () => {
    expect(
      sameFact(
        { question: 'What units does Km have?', answer: 'Concentration' },
        { question: 'Km is defined in terms of which rate constants?', answer: '(k-1 + k2)/k1' },
      ),
    ).toBe(false);
  });
});

describe('different facts about one topic', () => {
  it('a plot’s slope and its intercept are not the same fact', () => {
    expect(sameFact({ question: 'On a Lineweaver–Burk plot, what is the y-intercept?', answer: '1/Vmax.' }, { question: 'On a Lineweaver–Burk plot, what is the slope of the line?', answer: 'Km/Vmax.' })).toBe(false);
  });
  it('one card printing a later one’s answer answers it, one way round only', () => {
    expect(
      answeredBy(
        { question: 'How leaves lose water: it evaporates through each stoma, which a guard cell opens and closes.', answer: 'Transpiration' },
        { question: 'The cell that opens and closes a stoma.', answer: 'Guard cell' },
      ),
    ).toBe(true);
    // Asked for the term, then a question that names it: nothing given away.
    expect(answeredBy({ question: 'The cell that opens and closes a stoma.', answer: 'Guard cell' }, { question: 'What does a guard cell do when the plant is short of water?', answer: 'Shuts its pore' })).toBe(false);
  });
});

describe('answers that only look alike', () => {
  it('two kinases are two facts', () => {
    expect(sameFact({ question: 'meaning of the thing number 2', answer: 'Protein kinase A' }, { question: 'meaning of the thing number 7', answer: 'Protein kinase C' })).toBe(false);
  });
  it('two questions answered "Increases" are two facts', () => {
    expect(sameFact({ question: 'What happens to Km with a competitive inhibitor?', answer: 'Increases' }, { question: 'What does raising temperature do to the rate below the optimum?', answer: 'Increases' })).toBe(false);
  });
  it('a term asked typed and as a question is one fact', () => {
    expect(sameFact({ question: 'The cell that opens and closes a stoma.', answer: 'Guard cell' }, { question: 'Which cell swells with water to open a pore in the leaf?', answer: 'Guard cell' })).toBe(true);
  });
});

describe('symbols', () => {
  it('the x-intercept and the y-intercept are two facts', () => {
    expect(sameFact({ question: 'On a Lineweaver–Burk plot, what is the x-intercept?', answer: '−1/Km' }, { question: 'On a Lineweaver–Burk plot, what is the y-intercept?', answer: '1/Vmax' })).toBe(false);
  });
});

describe('contrasts and uses are new angles, not repeats', () => {
  it('two inhibitors side by side', () => {
    expect(
      sameFact(
        { question: 'What does a competitive inhibitor do to apparent Km and apparent Vmax?', answer: 'Apparent Km increases; Vmax is unchanged.' },
        { question: 'What does a mixed inhibitor do to apparent Km and apparent Vmax?', answer: 'Apparent Km may increase or decrease; apparent Vmax decreases.' },
      ),
    ).toBe(false);
  });
  it('a fact and a worked problem that uses it', () => {
    expect(
      sameFact(
        { question: 'On a Lineweaver–Burk plot, what is the x-intercept?', answer: '−1/Km (note the minus sign).' },
        { question: 'A Lineweaver–Burk plot has its x-intercept at 1/[S] = −0.5 mM⁻¹. What is Km?', answer: '2.0 mM' },
      ),
    ).toBe(false);
  });
  it('the same question turned around is still a repeat', () => {
    expect(
      sameFact(
        { question: 'Why does feedback inhibition usually target the committed step?', answer: 'Because inhibiting at the first irreversible reaction wastes nothing.' },
        { question: 'Why is the committed step the usual target of feedback inhibition?', answer: 'Because inhibiting there wastes no intermediates.' },
      ),
    ).toBe(true);
  });
});

describe('the term just typed, asked again as a question', () => {
  it('is one fact', () => {
    expect(
      sameFact(
        { question: 'The upward pull on water created as it evaporates from the leaves.', answer: 'Transpiration pull' },
        { question: 'Water evaporates from a leaf and draws the column below it upward. What is this called?', answer: 'Transpiration' },
      ),
    ).toBe(true);
  });
  it('a flashcard whose answer rewords the definition before it is answered by it', () => {
    expect(
      answeredBy(
        { question: 'The upward movement of water in a plant, driven by evaporation from the leaves and held together by cohesion between water molecules.', answer: 'Transpiration stream' },
        { question: 'What moves water up a plant?', answer: 'Evaporation at the leaves, and cohesion between the water molecules.' },
      ),
    ).toBe(true);
  });
});
