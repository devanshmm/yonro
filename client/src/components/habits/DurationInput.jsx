export function DurationInput({ prefix, label, value = 0 }) {
  return (
    <fieldset className="duration-input">
      <legend>{label}</legend>
      <div className="form-row">
        <label>
          {label} hours
          <input
            name={`${prefix}Hours`}
            type="number"
            min={0}
            max={1000000}
            step={1}
            defaultValue={Math.floor(value / 60)}
            required
          />
        </label>
        <label>
          {label} minutes
          <input
            name={`${prefix}Minutes`}
            type="number"
            min={0}
            max={59}
            step={1}
            defaultValue={value % 60}
            required
          />
        </label>
      </div>
    </fieldset>
  );
}
