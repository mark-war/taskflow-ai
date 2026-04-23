export default function TaskModal({ task, onClick }) {
  return (
    <div onClick={onClick}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
    </div>
  );
}
