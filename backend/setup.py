from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="libroteca-api",
    version="0.1.0",
    author="Alessandro Ledda",
    author_email="alessandro.ledda@tempocasa.com",
    description="FastAPI backend for Libroteca - AI-powered book creator",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/alessandroledda-del/Ebook-creator",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries",
        "Topic :: Office/Business",
        "Topic :: Multimedia :: Graphics :: Presentation",
    ],
    python_requires=">=3.9",
    install_requires=[
        "fastapi>=0.95.0",
        "uvicorn[standard]>=0.21.0",
        "motor>=3.1.1",
        "pydantic>=2.0.0",
        "anthropic>=0.7.0",
        "python-multipart>=0.0.5",
        "python-dotenv>=1.0.0",
        "ebooklib>=0.18",
        "pillow>=9.5.0",
        "requests>=2.31.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.3.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.3.0",
            "flake8>=6.0.0",
        ]
    },
    keywords="ai book-generator fastapi openai anthropic writing narrative",
    project_urls={
        "Bug Tracker": "https://github.com/alessandroledda-del/Ebook-creator/issues",
        "Documentation": "https://github.com/alessandroledda-del/Ebook-creator#readme",
        "Source Code": "https://github.com/alessandroledda-del/Ebook-creator",
    },
)
