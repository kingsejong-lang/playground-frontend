#!/bin/bash

# gRPC-Web code generation script
# Generates TypeScript client code from Protocol Buffer definitions

set -e

echo "🚀 Generating gRPC-Web TypeScript code from proto files..."

# Directories
PROTO_DIR="./proto"
OUT_DIR="./src/lib/grpc/generated"

# Clean and recreate output directory
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Find all proto files
PROTO_FILES=$(find "$PROTO_DIR" -name "*.proto")

if [ -z "$PROTO_FILES" ]; then
  echo "❌ No .proto files found in $PROTO_DIR"
  exit 1
fi

echo "📁 Found proto files:"
echo "$PROTO_FILES"
echo ""

# Generate TypeScript code for each proto file
for proto_file in $PROTO_FILES; do
  echo "🔨 Processing: $proto_file"

  protoc \
    --proto_path="$PROTO_DIR" \
    --js_out=import_style=commonjs,binary:"$OUT_DIR" \
    --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUT_DIR" \
    "$proto_file"
done

echo ""
echo "✅ Code generation complete!"
echo "📦 Generated files in: $OUT_DIR"
echo ""
echo "Generated files:"
ls -lh "$OUT_DIR"
