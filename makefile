default:
	./node_modules/.bin/vsce package

install:
	code --install-extension kani-extension-*.vsix

format:
	./node_modules/.bin/tsfmt -r src/*.ts

clean:
	$(RM) *~
	cd demo && make clean

veryclean: clean
	$(RM) -r out
	$(RM) src/*.js
	$(RM) *.vsix
