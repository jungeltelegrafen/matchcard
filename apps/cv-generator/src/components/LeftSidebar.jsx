import CommentsPanel from './CommentsPanel'
import TipsCarousel from './TipsCarousel'

export default function LeftSidebar({ lang, feedbackItems = [], onFeedbackChange, onSectionHover }) {
  return (
    <aside className="side-panel side-panel--left">
      <CommentsPanel
        lang={lang}
        chatComments={feedbackItems}
        onChatCommentsChange={onFeedbackChange}
        onSectionHover={onSectionHover}
      />
      <TipsCarousel lang={lang} />
    </aside>
  )
}
