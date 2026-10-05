interface P { size?: number }

const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
})

export const CheckIcon = ({ size = 16 }: P) => (
  <svg {...base(size)} strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)
export const PlusIcon = ({ size = 24 }: P) => (
  <svg {...base(size)} strokeWidth={2.6}><path d="M12 5v14M5 12h14" /></svg>
)
export const CalendarIcon = ({ size = 14 }: P) => (
  <svg {...base(size)}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
)
export const BackIcon = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={2.2}><path d="M15 5l-7 7 7 7" /></svg>
)
export const HomeIcon = ({ size = 24 }: P) => (
  <svg {...base(size)}><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" /></svg>
)
export const FolderIcon = ({ size = 24 }: P) => (
  <svg {...base(size)}><path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /></svg>
)
export const DoneIcon = ({ size = 24 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>
)
export const UserIcon = ({ size = 24 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" /></svg>
)
export const RefreshIcon = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></svg>
)
export const DeleteKeyIcon = ({ size = 24 }: P) => (
  <svg {...base(size)}><path d="M9 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5-6z" /><path d="M12 10l4 4M16 10l-4 4" /></svg>
)
export const ChevronIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M9 5l7 7-7 7" /></svg>
)
