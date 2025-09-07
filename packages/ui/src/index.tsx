import * as React from 'react';

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = '', ...rest } = props;
  return (
    <button
      {...rest}
      className={
        "px-3 py-1.5 rounded bg-blue-600 text-white shadow-sm hover:shadow transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-60 " +
        className
      }
    />
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div>{children}</div>
    </div>
  );
}
