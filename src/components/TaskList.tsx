   import { useState } from 'react'

   export interface Task {
     id: number
     title: string
     done: boolean
   }

   interface Props {
     initialTasks?: Task[]
   }

   export function TaskList({ initialTasks = [] }: Props) {
     const [tasks, setTasks] = useState<Task[]>(initialTasks)
     const [input, setInput] = useState('')

     function addTask() {
       if (!input.trim()) return
       setTasks([...tasks, { id: Date.now(), title: input.trim(), done: false }])
       setInput('')
     }

     function toggleTask(id: number) {
       setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
     }

     return (
       <div>
         <h1>Task Manager</h1>
         <input
           value={input}
           onChange={e => setInput(e.target.value)}
           placeholder="Add a task..."
           aria-label="New task"
         />
         <button onClick={addTask}>Add</button>
         <ul>
           {tasks.map(task => (
             <li key={task.id}>
               <input
                 type="checkbox"
                 checked={task.done}
                 onChange={() => toggleTask(task.id)}
                 aria-label={`Toggle ${task.title}`}
               />
               <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
                 {task.title}
               </span>
             </li>
           ))}
         </ul>
       </div>
     )
   }