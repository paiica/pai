// Progressive-enhancement wiring for the click-to-categorize / drag-and-drop
// sorting exercise emitted by the Rise-export importer (see
// rise-html-blocks.ts on the backend — SORT_ENHANCER_SCRIPT there is the
// same logic as plain JS, kept in sync by hand since it runs inline inside
// a sandboxed iframe srcDoc document this file can't reach into). Everything
// else that importer produces — accordion, tabs, flashcards, timeline,
// process — is plain CSS (checkbox/radio-driven) and needs no JS at all, so
// this is the only interactive block that requires this hook.
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
    let dragged: HTMLElement | null = null;

    const clearSelection = () => {
      if (selected) selected.classList.remove("pv-sort-selected");
      selected = null;
    };

    const select = (item: HTMLElement) => {
      clearSelection();
      selected = item;
      item.classList.add("pv-sort-selected");
    };

    const pop = (item: HTMLElement) => {
      item.classList.add("pv-sort-pop");
      item.addEventListener("animationend", () => item.classList.remove("pv-sort-pop"), { once: true });
    };

    const place = (item: HTMLElement, target: HTMLElement) => {
      target.appendChild(item);
      item.classList.remove("pv-sort-selected");
      pop(item);
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
        place(selected, category);
        clearSelection();
        return;
      }

      if (target.closest("[data-sort-bank]") && selected) {
        place(selected, bank);
        clearSelection();
      }
    };

    // Drag-and-drop — progressive enhancement alongside the click-to-select
    // flow above (kept for touch/accessibility); both work on the same items.
    const onDragStart = (e: DragEvent) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>("[data-sort-item]");
      if (!item || item.dataset.locked) { e.preventDefault(); return; }
      dragged = item;
      clearSelection();
      item.classList.add("pv-sort-dragging");
      if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ""); }
    };
    const onDragEnd = () => {
      if (dragged) dragged.classList.remove("pv-sort-dragging");
      dragged = null;
      exercise.querySelectorAll(".pv-sort-dragover").forEach((el) => el.classList.remove("pv-sort-dragover"));
    };
    const onDragOver = (e: DragEvent) => {
      const zone = (e.target as HTMLElement).closest<HTMLElement>("[data-sort-category], [data-sort-bank]");
      if (!zone || !dragged) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      zone.classList.add("pv-sort-dragover");
    };
    const onDragLeave = (e: DragEvent) => {
      const zone = (e.target as HTMLElement).closest<HTMLElement>("[data-sort-category], [data-sort-bank]");
      if (zone) zone.classList.remove("pv-sort-dragover");
    };
    const onDrop = (e: DragEvent) => {
      const zone = (e.target as HTMLElement).closest<HTMLElement>("[data-sort-category], [data-sort-bank]");
      if (!zone || !dragged) return;
      e.preventDefault();
      zone.classList.remove("pv-sort-dragover");
      place(dragged, zone);
    };

    const onCheck = () => {
      const items = exercise.querySelectorAll<HTMLElement>("[data-sort-item]");
      items.forEach((item) => {
        const parentCategory = item.closest<HTMLElement>("[data-sort-category]");
        const correct = parentCategory?.dataset.categoryId === item.dataset.correctCategory;
        item.dataset.locked = "true";
        item.style.pointerEvents = "none";
        item.draggable = false;
        item.classList.remove("pv-sort-selected");
        if (parentCategory) {
          item.classList.add(correct ? "pv-sort-correct" : "pv-sort-incorrect");
          if (!correct) {
            item.classList.add("pv-sort-shake");
            item.addEventListener("animationend", () => item.classList.remove("pv-sort-shake"), { once: true });
          }
        } else {
          // Never placed anywhere — flag it without claiming right/wrong.
          item.classList.add("pv-sort-unplaced");
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
        item.draggable = true;
        item.classList.remove("pv-sort-correct", "pv-sort-incorrect", "pv-sort-unplaced");
        bank.appendChild(item);
      });
      clearSelection();
      checkBtn.style.display = "";
      resetBtn.hidden = true;
    };

    exercise.addEventListener("click", onClick);
    exercise.addEventListener("dragstart", onDragStart as EventListener);
    exercise.addEventListener("dragend", onDragEnd);
    exercise.addEventListener("dragover", onDragOver as EventListener);
    exercise.addEventListener("dragleave", onDragLeave as EventListener);
    exercise.addEventListener("drop", onDrop as EventListener);
    checkBtn.addEventListener("click", onCheck);
    resetBtn.addEventListener("click", onReset);

    cleanups.push(() => {
      exercise.removeEventListener("click", onClick);
      exercise.removeEventListener("dragstart", onDragStart as EventListener);
      exercise.removeEventListener("dragend", onDragEnd);
      exercise.removeEventListener("dragover", onDragOver as EventListener);
      exercise.removeEventListener("dragleave", onDragLeave as EventListener);
      exercise.removeEventListener("drop", onDrop as EventListener);
      checkBtn.removeEventListener("click", onCheck);
      resetBtn.removeEventListener("click", onReset);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
