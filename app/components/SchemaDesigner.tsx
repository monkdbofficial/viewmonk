'use client';

import { useState } from 'react';

interface Field {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  default?: string;
}

export default function SchemaDesigner() {
  const [collectionName, setCollectionName] = useState('users');
  const [fields, setFields] = useState<Field[]>([
    { name: '_id', type: 'ObjectId', required: true, unique: true },
    { name: 'name', type: 'String', required: true, unique: false },
    { name: 'email', type: 'String', required: true, unique: true },
    { name: 'age', type: 'Number', required: false, unique: false },
    { name: 'createdAt', type: 'Date', required: true, unique: false, default: 'Date.now' },
  ]);

  const dataTypes = [
    'String',
    'Number',
    'Boolean',
    'Date',
    'ObjectId',
    'Array',
    'Object',
    'Buffer',
    'Decimal',
  ];

  const addField = () => {
    setFields([
      ...fields,
      { name: 'newField', type: 'String', required: false, unique: false },
    ]);
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const generateSchema = () => {
    const schemaObj = fields.reduce((acc, field) => {
      acc[field.name] = {
        type: field.type,
        required: field.required,
        unique: field.unique,
        ...(field.default && { default: field.default }),
      };
      return acc;
    }, {} as Record<string, any>);

    return `const ${collectionName}Schema = new Schema(${JSON.stringify(schemaObj, null, 2)});

const ${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)} = model('${collectionName}', ${collectionName}Schema);

module.exports = ${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)};`;
  };

  const generateValidation = () => {
    return `{
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [${fields.filter((f) => f.required).map((f) => `"${f.name}"`).join(', ')}],
      properties: {
${fields
  .map(
    (f) => `        "${f.name}": {
          bsonType: "${f.type.toLowerCase()}",
          description: "${f.name} is ${f.required ? 'required' : 'optional'}"
        }`
  )
  .join(',\n')}
      }
    }
  }
}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Schema Designer
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Design and visualize your database schema with validation
        </p>
      </div>

      {/* Collection Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Collection Name
        </label>
        <input
          type="text"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Fields Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Field Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Required
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Unique
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Default
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {fields.map((field, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateField(index, { name: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    disabled={field.name === '_id'}
                  />
                </td>
                <td className="px-6 py-4">
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, { type: e.target.value })}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {dataTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={field.unique}
                    onChange={(e) => updateField(index, { unique: e.target.checked })}
                    className="rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={field.default || ''}
                    onChange={(e) => updateField(index, { default: e.target.value })}
                    placeholder="Optional"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  {field.name !== '_id' && (
                    <button
                      onClick={() => removeField(index)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addField}
        className="rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
      >
        + Add Field
      </button>

      {/* Generated Code */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Schema Definition
            </label>
            <button
              onClick={() => navigator.clipboard.writeText(generateSchema())}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              📋 Copy
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <pre className="overflow-x-auto p-4 text-xs text-gray-900 dark:text-gray-100">
              {generateSchema()}
            </pre>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Validation Rules
            </label>
            <button
              onClick={() => navigator.clipboard.writeText(generateValidation())}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              📋 Copy
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <pre className="overflow-x-auto p-4 text-xs text-gray-900 dark:text-gray-100">
              {generateValidation()}
            </pre>
          </div>
        </div>
      </div>

      {/* Schema Visualization */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Schema Visualization
        </h3>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex-1">
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  {field.name}
                </span>
                <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                  {field.type}
                </span>
              </div>
              <div className="flex gap-2">
                {field.required && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                    Required
                  </span>
                )}
                {field.unique && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Unique
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
