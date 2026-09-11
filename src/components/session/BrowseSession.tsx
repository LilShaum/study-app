import { Link } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { EditableItem } from '@/components/items/EditableItem';
import { AddItemButton } from '@/components/items/AddItemButton';

interface BrowseSessionProps {
  courseId: string;
  course: Course;
}

/** "Browse" mode — every item, in order, editable in place. */
export function BrowseSession({ courseId, course }: BrowseSessionProps) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <Link to={`/study/${courseId}`} className="text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent">Browse</span>
      </div>
      <h1 className="mb-6 text-2xl font-semibold text-text">{course.metadata.title}</h1>

      {course.sections.map((section) => (
        <div key={section.id} className="mb-10">
          <h2 className="text-lg font-semibold text-text">{section.title}</h2>
          {section.description && <p className="mt-1 text-sm text-text-2">{section.description}</p>}
          <div className="mt-4 space-y-4">
            {section.items.map((item) => (
              <EditableItem key={item.id} courseId={courseId} sectionId={section.id} item={item} />
            ))}
            <AddItemButton courseId={courseId} sectionId={section.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
