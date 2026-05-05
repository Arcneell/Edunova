export function PaginationBar({
  page,
  prevLabel = 'Précédent',
  nextLabel = 'Suivant',
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}) {
  return (
    <>
      <button
        type="button"
        className="dash-pager__btn"
        disabled={prevDisabled}
        onClick={onPrev}
      >
        {prevLabel}
      </button>
      <span className="dash-pager__info">
        Page <strong>{page}</strong>
      </span>
      <button
        type="button"
        className="dash-pager__btn dash-pager__btn--primary"
        disabled={nextDisabled}
        onClick={onNext}
      >
        {nextLabel}
      </button>
    </>
  )
}
