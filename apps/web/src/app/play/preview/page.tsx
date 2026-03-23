import PlayDashboard from '../PlayDashboard'

export default function PlayPreview() {
  return (
    <PlayDashboard
      userId="preview"
      displayName="Matt Johnson"
      handicapIndex={14.2}
      roundsCount={47}
      rounds={[
        { id: '1', created_at: '2024-03-15T10:00:00Z', round_type: 'individual', events: { name: 'Friday Roll-up', date: '2024-03-15', format: 'stableford', courses: { name: 'Cumberwell Park' }, course_combinations: { name: 'Blue/Yellow' } } },
        { id: '2', created_at: '2024-03-08T10:00:00Z', round_type: 'individual', events: { name: 'Society Day', date: '2024-03-08', format: 'strokeplay', courses: { name: 'The Manor House' }, course_combinations: null } },
        { id: '3', created_at: '2024-02-28T10:00:00Z', round_type: 'individual', events: { name: 'Club Championship', date: '2024-02-28', format: 'matchplay', courses: { name: 'Cumberwell Park' }, course_combinations: { name: 'Red/Yellow' } } },
      ]}
    />
  )
}
