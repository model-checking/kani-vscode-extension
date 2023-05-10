VSCE=./node_modules/.bin/vsce

package default:
	$(VSCE) package

publish:
	$(VSCE) publish

install:
	code --install-extension cbmc-proof-debugger-*.vsix

format:
	./node_modules/.bin/tsfmt -r src/*.ts

clean:
	$(RM) *~
	cd demo && make clean

veryclean: clean
	$(RM) -r out
	$(RM) src/*.js
	$(RM) *.vsix

setup-macos:
	brew install node
	npm install

setup-ubuntu:
	sudo apt install nodejs npm
	npm install

.PHONY: default package publish install format clean veryclean
.PHONY: setup-macos setup-ubuntu
