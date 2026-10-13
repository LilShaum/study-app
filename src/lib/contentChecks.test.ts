import { describe, expect, it } from 'vitest';
import { answeredBy, givesAway, sameFact } from './contentChecks';

describe('a definition that gives its term away', () => {
  it('catches the owner’s examples', () => {
    expect(givesAway('Cell signaling', 'The way cells communicate with other cells: a signaling cell sends a signal (usually a chemical) and a target cell receives the signal and responds to it.')).toBe(true);
    expect(givesAway('Signaling cell', 'The cell that sends a signal (usually a chemical) in cell signaling.')).toBe(true);
  });
  it('lets a definition that does not name it through', () => {
    expect(givesAway('Target cell', 'The cell that receives a chemical message and responds to it.')).toBe(false);
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
    expect(sameFact({ question: 'Name the cell that sends the signal.', answer: 'Signaling cell' }, { question: 'The cell that sends a signal.', answer: 'signaling cell' })).toBe(true);
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
        { question: 'The way cells communicate: a signaling cell sends a signal and a target cell responds.', answer: 'Cell signaling' },
        { question: 'The cell that receives the signal and responds to it.', answer: 'Target cell' },
      ),
    ).toBe(true);
    // Asked for the term, then a question that names it: nothing given away.
    expect(answeredBy({ question: 'The cell that receives a signal.', answer: 'Target cell' }, { question: 'What does a target cell carry?', answer: 'Receptors' })).toBe(false);
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
    expect(sameFact({ question: 'The cell that receives a signal and responds to it.', answer: 'Target cell' }, { question: 'Which cell carries the receptor that a hormone binds?', answer: 'Target cell' })).toBe(true);
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
        { question: 'Short-distance indirect signaling in which the messenger diffuses back to the cell that released it.', answer: 'Autocrine signaling' },
        { question: 'A chemical released by a cell diffuses a short distance and binds receptors on the same cell. What kind of signaling is this?', answer: 'Autocrine' },
      ),
    ).toBe(true);
  });
  it('a flashcard whose answer rewords the definition before it is answered by it', () => {
    expect(
      answeredBy(
        { question: 'Regulation of physiological processes so that each stays within a range, held there by feedback loops.', answer: 'Homeostasis' },
        { question: 'How are physiological processes regulated?', answer: 'Within ranges, by feedback loops.' },
      ),
    ).toBe(true);
  });
});
