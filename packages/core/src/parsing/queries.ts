export const JS_FAMILY_QUERY = `
(function_declaration) @chunk
(class_declaration) @chunk
(method_definition) @chunk
`;

export const PYTHON_QUERY = `
(function_definition) @chunk
(class_definition) @chunk
`;
