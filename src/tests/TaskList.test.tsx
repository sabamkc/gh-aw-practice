import { render, screen, fireEvent } from '@testing-library/react'
   import { TaskList } from '../components/TaskList'

   describe('TaskList', () => {
     it('renders the heading', () => {
       render(<TaskList />)
       expect(screen.getByText('Task Manager')).toBeInTheDocument()
     })

     it('adds a new task', () => {
       render(<TaskList />)
       fireEvent.change(screen.getByLabelText('New task'), { target: { value: 'Buy milk' } })
       fireEvent.click(screen.getByText('Add'))
       expect(screen.getByText('Buy milk')).toBeInTheDocument()
     })

     it('toggles a task done', () => {
       const tasks = [{ id: 1, title: 'Write tests', done: false }]
       render(<TaskList initialTasks={tasks} />)
       fireEvent.click(screen.getByLabelText('Toggle Write tests'))
       expect(screen.getByText('Write tests')).toHaveStyle('text-decoration: line-through')
     })

     it('does not add empty task', () => {
       render(<TaskList />)
       fireEvent.click(screen.getByText('Add'))
       expect(screen.queryAllByRole('listitem')).toHaveLength(0)
     })
   })