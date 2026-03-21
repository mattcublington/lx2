// Cumberwell Park course data — seeded manually until bulk import is complete
// Each "course" is a combined 18-hole layout from two 9-hole loops

export interface CourseHole {
  num: number
  par: number
  si: number
  yards: number
}

export interface Course {
  id: string
  name: string
  club: string
  location: string
  holes: CourseHole[]
  slopeRating: number
  courseRating: number
  par: number
  tees: string[]
}

export const COURSES: Course[] = [
  {
    id: 'cumberwell-red-yellow',
    name: 'Cumberwell Park — Red/Yellow',
    club: 'Cumberwell Park',
    location: 'Bradford-on-Avon, Wiltshire',
    slopeRating: 120, courseRating: 70.2, par: 72,
    tees: ['Yellow', 'White', 'Red'],
    holes: [
      { num: 1, par: 4, si: 7, yards: 342 }, { num: 2, par: 4, si: 3, yards: 387 },
      { num: 3, par: 3, si: 15, yards: 155 }, { num: 4, par: 4, si: 11, yards: 310 },
      { num: 5, par: 5, si: 1, yards: 498 }, { num: 6, par: 4, si: 9, yards: 365 },
      { num: 7, par: 3, si: 13, yards: 170 }, { num: 8, par: 4, si: 5, yards: 395 },
      { num: 9, par: 5, si: 17, yards: 475 }, { num: 10, par: 4, si: 8, yards: 355 },
      { num: 11, par: 3, si: 16, yards: 148 }, { num: 12, par: 4, si: 2, yards: 410 },
      { num: 13, par: 4, si: 12, yards: 325 }, { num: 14, par: 5, si: 4, yards: 505 },
      { num: 15, par: 4, si: 10, yards: 348 }, { num: 16, par: 3, si: 18, yards: 135 },
      { num: 17, par: 4, si: 6, yards: 380 }, { num: 18, par: 5, si: 14, yards: 490 },
    ],
  },
  {
    id: 'cumberwell-red-blue',
    name: 'Cumberwell Park — Red/Blue',
    club: 'Cumberwell Park',
    location: 'Bradford-on-Avon, Wiltshire',
    slopeRating: 122, courseRating: 70.8, par: 72,
    tees: ['Yellow', 'White', 'Red'],
    holes: [
      { num: 1, par: 4, si: 7, yards: 342 }, { num: 2, par: 4, si: 3, yards: 387 },
      { num: 3, par: 3, si: 15, yards: 155 }, { num: 4, par: 4, si: 11, yards: 310 },
      { num: 5, par: 5, si: 1, yards: 498 }, { num: 6, par: 4, si: 9, yards: 365 },
      { num: 7, par: 3, si: 13, yards: 170 }, { num: 8, par: 4, si: 5, yards: 395 },
      { num: 9, par: 5, si: 17, yards: 475 }, { num: 10, par: 4, si: 6, yards: 368 },
      { num: 11, par: 3, si: 14, yards: 162 }, { num: 12, par: 5, si: 2, yards: 521 },
      { num: 13, par: 4, si: 10, yards: 334 }, { num: 14, par: 4, si: 4, yards: 412 },
      { num: 15, par: 3, si: 18, yards: 142 }, { num: 16, par: 4, si: 8, yards: 378 },
      { num: 17, par: 5, si: 12, yards: 488 }, { num: 18, par: 4, si: 16, yards: 298 },
    ],
  },
  {
    id: 'cumberwell-yellow-blue',
    name: 'Cumberwell Park — Yellow/Blue',
    club: 'Cumberwell Park',
    location: 'Bradford-on-Avon, Wiltshire',
    slopeRating: 121, courseRating: 70.5, par: 72,
    tees: ['Yellow', 'White', 'Red'],
    holes: [
      { num: 1, par: 4, si: 5, yards: 358 }, { num: 2, par: 4, si: 1, yards: 412 },
      { num: 3, par: 3, si: 13, yards: 162 }, { num: 4, par: 5, si: 9, yards: 492 },
      { num: 5, par: 4, si: 3, yards: 385 }, { num: 6, par: 4, si: 11, yards: 328 },
      { num: 7, par: 3, si: 17, yards: 148 }, { num: 8, par: 4, si: 7, yards: 376 },
      { num: 9, par: 5, si: 15, yards: 510 }, { num: 10, par: 4, si: 6, yards: 368 },
      { num: 11, par: 3, si: 14, yards: 162 }, { num: 12, par: 5, si: 2, yards: 521 },
      { num: 13, par: 4, si: 10, yards: 334 }, { num: 14, par: 4, si: 4, yards: 412 },
      { num: 15, par: 3, si: 18, yards: 142 }, { num: 16, par: 4, si: 8, yards: 378 },
      { num: 17, par: 5, si: 12, yards: 488 }, { num: 18, par: 4, si: 16, yards: 298 },
    ],
  },
]

export function searchCourses(query: string): Course[] {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return COURSES.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.club.toLowerCase().includes(q) ||
    c.location.toLowerCase().includes(q)
  ).slice(0, 8)
}

export function getCourse(id: string): Course | undefined {
  return COURSES.find(c => c.id === id)
}
