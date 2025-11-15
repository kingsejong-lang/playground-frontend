#!/bin/bash

# Script to generate TypeScript code from protobuf definitions
# This script uses protoc with the grpc-web plugin to generate client code

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Generating TypeScript code from protobuf definitions...${NC}"

# Check if protoc is installed
if ! command -v protoc &> /dev/null; then
    echo -e "${RED}Error: protoc is not installed${NC}"
    echo "Please install protobuf compiler:"
    echo "  macOS: brew install protobuf"
    echo "  Linux: apt-get install protobuf-compiler"
    exit 1
fi

# Check if protoc-gen-grpc-web is installed
if ! command -v protoc-gen-grpc-web &> /dev/null; then
    echo -e "${RED}Error: protoc-gen-grpc-web is not installed${NC}"
    echo "Please install grpc-web protoc plugin:"
    echo "  macOS: brew install protoc-gen-grpc-web"
    echo "  Linux: See https://github.com/grpc/grpc-web#code-generator-plugin"
    exit 1
fi

# Directories
PROTO_DIR="proto"
OUT_DIR="src/lib/grpc/generated"

# Create output directory
mkdir -p "$OUT_DIR"

# Clean previous generated files
rm -rf "$OUT_DIR"/*

echo -e "${YELLOW}Cleaning previous generated files...${NC}"

# Generate TypeScript code for each proto file
echo -e "${YELLOW}Generating code for execution service...${NC}"
protoc \
  -I="$PROTO_DIR" \
  --js_out=import_style=commonjs,binary:"$OUT_DIR" \
  --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUT_DIR" \
  "$PROTO_DIR/execution/v1/execution.proto"

echo -e "${YELLOW}Generating code for language service...${NC}"
protoc \
  -I="$PROTO_DIR" \
  --js_out=import_style=commonjs,binary:"$OUT_DIR" \
  --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUT_DIR" \
  "$PROTO_DIR/language/v1/language.proto"

echo -e "${YELLOW}Generating code for storage service...${NC}"
protoc \
  -I="$PROTO_DIR" \
  --js_out=import_style=commonjs,binary:"$OUT_DIR" \
  --grpc-web_out=import_style=typescript,mode=grpcwebtext:"$OUT_DIR" \
  "$PROTO_DIR/storage/v1/storage.proto"

echo -e "${GREEN}✓ Code generation completed successfully!${NC}"
echo -e "Generated files are in: $OUT_DIR"

# List generated files
echo -e "\n${YELLOW}Generated files:${NC}"
ls -lh "$OUT_DIR"
