import { TodoList } from '@/components/TodoList';

export default function TodosPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">My Todos</h1>
      <TodoList />
    </div>
  );
}
