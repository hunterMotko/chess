package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"log"
	"os"
	"path"
	"strings"
)

func main() {
	fp := flag.String("path", "", "file path")
	flag.Parse()

	if *fp == "" {
		log.Fatal("Provide a file\n")
	}

	f, err := os.Open(*fp)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.Comma = '\t'
	recs, err := reader.ReadAll()
	if err != nil {
		log.Fatal(err)
	}

	dir, file := path.Split(*fp)
	fileSl := strings.Split(file, ".")
	newFilePath := fmt.Sprintf("%s/%s.%s", dir, fileSl[0], "csv")

	newFile, err := os.Create(newFilePath)
	if err != nil {
		log.Fatal(err)
	}

	writer := csv.NewWriter(newFile)
	writer.Comma = ','
	writer.WriteAll(recs)
}
