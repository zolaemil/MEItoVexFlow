# ODD Specification

## What is ODD

MEI recommends the use of [One Document Does-it-all](http://www.tei-c.org/Guidelines/Customization/odds.xml) (ODD) to define a customization -- or subset -- of its large specification. ODD is a Text Encoding Initiative file that defines such customization. An XML schema can be generated using the [TEI Roma](https://github.com/TEIC/Roma) tool. The compiled schema is provided in the directory for the user's convenience and to conveniently validate our tests. 

## How to use the schema

The MEI customization for MEI to VexFlow restricts the MEI format to the elements that MEI to VexFlow currently supports. This can be useful to check your MEI files before using them with MEI to VexFlow. If the file doesn't validate, it's likely to not be fully displayed, or to somehow break the rendering process.

Our schema relies heavily on Schematron. Remember to associate the schema both as Relax and as Schematron. For example:

```
<?xml-model href="mei2vexflow.rng" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"?>
<?xml-model href="mei2vexflow.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
```

## A note about the header (`<meiHead>`)

MEI has a strong vocabulary for metadata, most of which is used in the header (inside the `<meiHead>` element). The header is ignored by MEI to VexFlow, so our schema does not exclude it, but nothing from the header will be rendered. You should be able to validate an MEI file containing a standard header for usage with MEI to VexFlow.

## On using ODD to profile an MEI application (for MEI nerds)

(Adapted from a forthcoming paper abstract:)

A typical MEI project uses ODD to select MEI modules (e.g. CMN vs. mensural) and fine tune those aspects of MEI that are left intentionally ambiguous (e.g. using the tie element for ties vs the tie attribute on note elements).
The resulting schema is used to monitor MEI encoding, and finally publishing applications are designed around the rules and restrictions expressed in the ODD.

<img alt="top down approach" src="https://writelatex.s3.amazonaws.com/filepicker/T2ngqfGiTrudmlRNpXes_GSoC%20paper%20top-down.png" width="250"/>

In MEI to VexFlow, we use ODD to define an application profile rather than encoding requirements. We document the subset of CMN that the application is able to support and which MEI encoding it expects for rendering such a subset. A derived schema may be used to validate in-progress MEI files to determine what will be rendered and what will cause errors or be ignored. A project team producing complex MEI documents can use this information to create middleware that simplifies their encodings to match MEI to VexFlow requirements.

<img alt="ODD for application profiling" src="https://writelatex.s3.amazonaws.com/filepicker/miBlFy4RSqfmg3l64A8x_ODD_app-profile.png" width="250"/>

With this ODD profiling, we want MEI to VexFlow to “speak the same language” as the MEI projects it aims to support, hopefully making integration less challenging.