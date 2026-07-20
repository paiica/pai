// Progressive-enhancement wiring for the click-to-categorize sorting
// exercise emitted by the Rise-export importer (see rise-html-blocks.ts on
// the backend). Everything else that importer produces — accordion, tabs,
// flashcards, timeline, process — is plain <details>/CSS and needs no JS at
// all, so this is the only interactive block that requires this hook.
//
// Call from a useEffect after the container's innerHTML is set (e.g. right
// after a dangerouslySetInnerHTML render), keyed on the content so it
// re-runs when the lesson changes:
//
//   const ref = useRef<HTMLDivElement>(null);
//   useEffect(() => {
//     if (!ref.current) return;
//     return enhanceSortingExercises(ref.current);
//   }, [lesson.content_body]);

export function enhanceSortingExercises(container: HTMLElement): () => void {
  const exercises = container.querySelectorAll<HTMLElement>("[data-sort-exercise]");
  const cleanups: (() => void)[] = [];

  exercises.forEach((exercise) => {
    const bank = exercise.querySelector<HTMLElement>("[data-sort-bank]");
    const checkBtn = exercise.querySelector<HTMLButtonElement>("[data-sort-check]");
    const resetBtn = exercise.querySelector<HTMLButtonElement>("[data-sort-reset]");
    if (!bank || !checkBtn || !resetBtn) return;

    let selected: HTMLElement | null = null;

    const clearSelection = () => {
      if (selected) selected.style.outline = "";
      selected = null;
    };

    const select = (item: HTMLElement) => {
      clearSelection();
      selected = item;
      item.style.outline = "2px solid #0f172a";
    };

    // Single delegated listener on the whole exercise — items get moved
    // between the bank and category containers via real DOM moves
    // (appendChild), so a listener scoped to just the bank would stop
    // firing once an item leaves it. Delegating from the exercise root
    // means placed items stay clickable (to re-select and move them again)
    // right up until they're locked by "Check Answers".
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const item = target.closest<HTMLElement>("[data-sort-item]");

      if (item && exercise.contains(item) && !item.dataset.locked) {
        if (selected === item) clearSelection();
        else select(item);
        return;
      }

      const category = target.closest<HTMLElement>("[data-sort-category]");
      if (category && selected) {
        selected.style.outline = "";
        category.appendChild(selected);
        clearSelection();
        return;
      }

      if (target.closest("[data-sort-bank]") && selected) {
        selected.style.outline = "";
        bank.appendChild(selected);
        clearSelection();
      }
    };

    const onCheck = () => {
      const items = exercise.querySelectorAll<HTMLElement>("[data-sort-item]");
      items.forEach((item) => {
        const parentCategory = item.closest<HTMLElement>("[data-sort-category]");
        const correct = parentCategory?.dataset.categoryId === item.dataset.correctCategory;
        item.dataset.locked = "true";
        item.style.pointerEvents = "none";
        item.style.outline = "";
        if (parentCategory) {
          item.style.background = correct ? "#dcfce7" : "#fee2e2";
          item.style.borderColor = correct ? "#22c55e" : "#ef4444";
        } else {
          // Never placed anywhere — flag it without claiming right/wrong.
          item.style.background = "#fef9c3";
          item.style.borderColor = "#eab308";
        }
      });
      clearSelection();
      checkBtn.style.display = "none";
      resetBtn.hidden = false;
    };

    const onReset = () => {
      const items = exercise.querySelectorAll<HTMLElement>("[data-sort-item]");
      items.forEach((item) => {
        delete item.dataset.locked;
        item.style.pointerEvents = "";
        item.style.background = "#fff";
        item.style.borderColor = "#cbd5e1";
        bank.appendChild(item);
      });
      clearSelection();
      checkBtn.style.display = "";
      resetBtn.hidden = true;
    };

    exercise.addEventListener("click", onClick);
    checkBtn.addEventListener("click", onCheck);
    resetBtn.addEventListener("click", onReset);

    cleanups.push(() => {
      exercise.removeEventListener("click", onClick);
      checkBtn.removeEventListener("click", onCheck);
      resetBtn.removeEventListener("click", onReset);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
