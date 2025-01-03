export const Input = ({ placeholder, value, onChange }) => {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        width: '100%',
        marginBottom: '16px',
      }}
    />
  );
};